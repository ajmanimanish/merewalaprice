import os
import re
import asyncio
from supabase import create_client
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

CONCURRENCY = 3 # Run 3 workers in parallel to avoid CPU throttling

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

def brand_match(brand, text):
    b, t = brand.lower(), text.lower()
    if b == "mi":         return "xiaomi" in t or " mi " in t
    if b == "blue star":  return "blue star" in t or "bluestar" in t
    return b in t

def model_match(model, text):
    m_clean = norm(model)
    t_clean = norm(text)
    
    if m_clean not in t_clean:
        return False
        
    if len(m_clean) < 5:
        tokens = re.findall(r'[a-z0-9]+', text.lower())
        has_exact = False
        for token in tokens:
            if token == m_clean:
                has_exact = True
                break
            if token.startswith(m_clean) and token[len(m_clean):] in ['5g', '4g', 'lte', 's', 'pro']:
                has_exact = True
                break
        if not has_exact:
            return False
            
    return True

# ══════════════════════════════════════════════════════════
# RESOLVERS
# ══════════════════════════════════════════════════════════

async def resolve_amazon(page: Page, brand: str, model: str) -> dict:
    """Finds direct Amazon page and ASIN or returns None"""
    q = f"{brand} {model}".replace(' ', '+')
    try:
        await page.goto(f"https://www.amazon.in/s?k={q}", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)
        
        if "captcha" in (await page.title()).lower():
            print(f"  [Amazon] Blocked by CAPTCHA for {brand} {model}")
            return None
            
        items = await page.query_selector_all('[data-asin]:not([data-asin=""])')
        for item in items[:4]:
            title_el = await item.query_selector('.a-size-medium, .a-size-base-plus, h2 span')
            if not title_el:
                continue
            title = await title_el.inner_text()
            asin = await item.get_attribute('data-asin')
            
            if brand_match(brand, title):
                # Fast Path: model is in the title
                if model_match(model, title):
                    return {"asin": asin, "url": f"https://www.amazon.in/dp/{asin}"}
                
                # Slow Path: navigate and verify
                link_el = await item.query_selector('h2 a')
                if link_el:
                    href = await link_el.get_attribute('href')
                    url = f"https://www.amazon.in{href}" if href.startswith('/') else href
                    try:
                        detail_page = await page.context.new_page()
                        await detail_page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await detail_page.wait_for_timeout(2000)
                        body_text = await detail_page.evaluate("() => document.body.innerText")
                        h1_el = await detail_page.query_selector('h1')
                        h1 = await h1_el.inner_text() if h1_el else ""
                        await detail_page.close()
                        
                        if model_match(model, h1) or model_match(model, body_text):
                            return {"asin": asin, "url": f"https://www.amazon.in/dp/{asin}"}
                    except Exception as details_err:
                        print(f"    [Amazon details err]: {details_err}")
                        try: await detail_page.close()
                        except: pass
    except Exception as e:
        print(f"  [Amazon err] {e}")
    return None

async def resolve_flipkart(page: Page, brand: str, model: str) -> str:
    """Finds direct Flipkart product page URL or returns None"""
    q = f"{brand} {model}".replace(' ', '+')
    try:
        await page.goto(f"https://www.flipkart.com/search?q={q}", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2500)
        
        # Close login popups if any
        for sel in ['button._2KpZ6l._2doB4z', 'button[class*="close"]']:
            try:
                btn = await page.query_selector(sel)
                if btn: await btn.click()
            except: pass

        links = await page.query_selector_all('a.k7wcnx, [data-id] a[href*="/p/"]')
        for link_el in links[:4]:
            href = await link_el.get_attribute('href') or ''
            img  = await link_el.query_selector('img')
            alt  = await img.get_attribute('alt') if img else ''
            
            # Fast Path: model is in the alt title
            if alt and brand_match(brand, alt) and model_match(model, alt):
                return f"https://www.flipkart.com{href}" if href.startswith('/') else href
            
            # Slow Path: navigate and verify
            if alt and brand_match(brand, alt):
                url = f"https://www.flipkart.com{href}" if href.startswith('/') else href
                try:
                    detail_page = await page.context.new_page()
                    await detail_page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    await detail_page.wait_for_timeout(2000)
                    body_text = await detail_page.evaluate("() => document.body.innerText")
                    h1_el = await detail_page.query_selector('h1')
                    h1 = await h1_el.inner_text() if h1_el else ""
                    await detail_page.close()
                    
                    if model_match(model, h1) or model_match(model, body_text):
                        return url
                except Exception as details_err:
                    print(f"    [Flipkart details err]: {details_err}")
                    try: await detail_page.close()
                    except: pass
    except Exception as e:
        print(f"  [Flipkart err] {e}")
    return None

# ══════════════════════════════════════════════════════════
# WORKERS
# ══════════════════════════════════════════════════════════

async def worker(worker_id: int, queue: asyncio.Queue, browser):
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = await ctx.new_page()
    
    while True:
        product = await queue.get()
        pid = product["id"]
        brand = product["brand"]
        model = product["model_number"]
        cat = product["category"]
        
        print(f"[Worker {worker_id}] Checking {brand} {model} ({cat})...")
        
        # 1. Resolve Amazon
        amz = await resolve_amazon(page, brand, model)
        if amz:
            print(f"  -> Amazon SUCCESS: ASIN={amz['asin']}, URL={amz['url']}")
            supabase.table("products").update({
                "asin": amz["asin"],
                "amazon_url": amz["url"]
            }).eq("id", pid).execute()
        else:
            print(f"  -> Amazon NOT FOUND/MISMAPPED. Setting to NULL.")
            supabase.table("products").update({
                "asin": None,
                "amazon_url": None
            }).eq("id", pid).execute()
            
        # 2. Resolve Flipkart
        fk_url = await resolve_flipkart(page, brand, model)
        if fk_url:
            print(f"  -> Flipkart SUCCESS: URL={fk_url[:70]}...")
            supabase.table("products").update({
                "flipkart_url": fk_url
            }).eq("id", pid).execute()
        else:
            print(f"  -> Flipkart NOT FOUND/MISMAPPED. Setting to NULL.")
            supabase.table("products").update({
                "flipkart_url": None
            }).eq("id", pid).execute()
            
        queue.task_done()
        await asyncio.sleep(2)

async def main():
    print("Fetching active products from database...")
    res = supabase.table("products").select("id,brand,name,model_number,category").eq("is_active", True).execute()
    products = res.data
    print(f"Loaded {len(products)} products.")
    
    # Exclude Blue Star IE518PNU since we already fixed it manually
    products_to_process = [p for p in products if p["model_number"] != "IE518PNU"]
    
    queue = asyncio.Queue()
    for p in products_to_process:
        await queue.put(p)
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Start workers
        workers = []
        for i in range(CONCURRENCY):
            w = asyncio.create_task(worker(i + 1, queue, browser))
            workers.append(w)
            
        await queue.join()
        
        # Cancel workers
        for w in workers:
            w.cancel()
            
        await browser.close()
    print("Catalog URL reconciliation completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
