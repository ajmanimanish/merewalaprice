"""
Price Scraper v5 — FINAL CORRECT VERSION
Fixes:
  1. Croma: DuckDuckGo HTML search → find croma.com product URL → span.amount
  2. Croma pin: JS force-click (bypasses mobile-hidden visibility)
  3. Flipkart: category price floors to filter out accessories
  4. Amazon: same price floor filter

Platforms: Amazon | Flipkart | Croma (Bhopal pin 462001)
"""
import asyncio, json, os, re, datetime
from playwright.async_api import async_playwright, Page

BHOPAL_PIN    = "462001"
ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
MODELS_FILE   = "/Users/manish/Desktop/merawalaprice/scratch/popular_50_models.json"
OUTPUT_FILE   = f"{ARTIFACTS_DIR}/price_data.json"
PROGRESS_FILE = f"{ARTIFACTS_DIR}/price_data_progress.json"

# Category price floors — filter out accessories / wrong matches
PRICE_FLOOR = {"AC": 12000, "FRIDGE": 7000, "WM": 5000, "TV": 7000}
PRICE_CEIL  = {"AC": 350000, "FRIDGE": 200000, "WM": 100000, "TV": 300000}

def load_models():
    with open(MODELS_FILE, 'rb') as f: raw = f.read()
    return json.loads(re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw.decode('utf-8')))

def load_progress():
    return json.load(open(PROGRESS_FILE)) if os.path.exists(PROGRESS_FILE) else {}

def save_progress(data):
    with open(PROGRESS_FILE, 'w') as f: json.dump(data, f, indent=2, ensure_ascii=False)
    with open(OUTPUT_FILE, 'w') as f: json.dump(list(data.values()), f, indent=2, ensure_ascii=False)

def clean_price(text, category="AC"):
    if not text: return None
    text = str(text).replace('₹','').replace('Rs','').replace(',','').strip()
    m = re.search(r'\b(\d{4,7})\b', text)
    if not m: return None
    val = int(m.group(1))
    floor = PRICE_FLOOR.get(category, 5000)
    ceil  = PRICE_CEIL.get(category, 500000)
    return val if floor <= val <= ceil else None

def brand_match(brand, text):
    b, t = brand.lower(), text.lower()
    if b == "mi":         return "xiaomi" in t or " mi " in t
    if b == "blue star":  return "blue star" in t or "bluestar" in t
    return b in t

def model_match(model, text):
    return re.sub(r'[\s\-_]','', model).lower() in re.sub(r'[\s\-_]','', text).lower()


# ══════════════════════════════════════════════════════════
# CROMA — set Bhopal pin once via JS force click
# ══════════════════════════════════════════════════════════
async def croma_set_pincode(page: Page):
    try:
        await page.goto("https://www.croma.com/", wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(3000)

        # Force-click the hidden mobile pin button via JavaScript
        clicked = await page.evaluate("""() => {
            const btn = document.querySelector('button.add-pincode-link');
            if (btn) { btn.click(); return true; }
            return false;
        }""")
        print(f"  [Croma] JS pin click: {clicked}")
        await page.wait_for_timeout(2000)

        # Find the pin input in any overlay/modal that appeared
        pin_filled = await page.evaluate(f"""() => {{
            const inputs = document.querySelectorAll('input');
            for (const inp of inputs) {{
                // Look for a newly visible 6-char input
                const rect = inp.getBoundingClientRect();
                if (rect.width > 0 && inp.maxLength == 6) {{
                    inp.value = '{BHOPAL_PIN}';
                    inp.dispatchEvent(new Event('input', {{bubbles: true}}));
                    inp.dispatchEvent(new Event('change', {{bubbles: true}}));
                    return 'filled:' + inp.className;
                }}
            }}
            // Fallback: try placeholder-based
            for (const inp of inputs) {{
                const ph = (inp.placeholder || '').toLowerCase();
                if (ph.includes('pin') || ph.includes('code') || ph.includes('zip')) {{
                    inp.value = '{BHOPAL_PIN}';
                    inp.dispatchEvent(new Event('input', {{bubbles: true}}));
                    return 'filled-ph:' + inp.placeholder;
                }}
            }}
            return 'not_found';
        }}""")
        print(f"  [Croma] Pin fill result: {pin_filled}")
        await page.wait_for_timeout(500)

        # Press Enter or click Apply button
        await page.evaluate("""() => {
            // Try to find an Apply/Submit button in any modal
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const t = (btn.innerText || '').toLowerCase().trim();
                if (t === 'apply' || t === 'submit' || t === 'check' || t === 'go') {
                    btn.click(); return 'clicked:' + t;
                }
            }
            // Fallback: press Enter on the input
            const inp = document.querySelector('input[maxlength="6"]');
            if (inp) { inp.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', keyCode:13, bubbles:true})); return 'enter'; }
            return 'no_button';
        }""")
        await page.wait_for_timeout(2000)

        # Verify pin was set
        pin_verify = await page.evaluate("() => document.body.innerText.match(/\\d{6}/)?.[0]")
        print(f"  [Croma] ✅ Pin on page: {pin_verify} (expected: {BHOPAL_PIN})")

    except Exception as e:
        print(f"  [Croma] Pin setup error: {e}")


# ══════════════════════════════════════════════════════════
# CROMA — find product via DuckDuckGo then scrape page
# ══════════════════════════════════════════════════════════
async def scrape_croma(page: Page, model: str, brand: str, category: str) -> dict:
    result = {"price": None, "url": None, "title": None}
    try:
        # Step 1: DuckDuckGo HTML search for croma.com product URL
        q = f"site:croma.com {brand} {model}".replace(' ', '+')
        await page.goto(f"https://html.duckduckgo.com/html/?q={q}",
                        wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2500)

        croma_url = await page.evaluate("""() => {
            const links = document.querySelectorAll('a.result__url, a.result__a, a[href*="croma.com"]');
            for (const a of links) {
                const href = a.href || a.getAttribute('href') || '';
                // Must be a Croma product page (has /p/ in URL)
                if (href.includes('croma.com') && (href.includes('/p/') || href.match(/\\/\\d{4,}/))) {
                    return href;
                }
                const text = (a.innerText || '').toLowerCase();
                if (text.includes('croma.com') && text.includes('/p/')) {
                    return 'https://' + text.trim();
                }
            }
            // Fallback: look for croma.com in all link text
            const allLinks = document.querySelectorAll('a[href]');
            for (const a of allLinks) {
                const href = a.getAttribute('href') || '';
                if (href.includes('croma.com/') && href.includes('/p/')) return href;
            }
            return null;
        }""")

        if not croma_url:
            print(f"    [Croma DDG] No product URL found for {brand} {model}")
            return result

        print(f"    [Croma DDG] Found: {croma_url[:80]}")

        # Step 2: Navigate to Croma product page
        await page.goto(croma_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(4000)

        # Step 3: Scrape price with confirmed working selectors
        price_text = await page.evaluate("""() => {
            // Best: span.amount (returns clean ₹43,490.00)
            const a = document.querySelector('span.amount');
            if (a) return a.innerText.trim();
            // Fallback: .new-price
            const n = document.querySelector('.new-price');
            if (n) return n.innerText.trim();
            // Fallback: any price-class element
            for (const el of document.querySelectorAll('[class*="price"],[class*="Price"]')) {
                const t = (el.innerText||'').trim();
                if (/₹[\\d,]{5,}/.test(t)) return t;
            }
            return null;
        }""")

        price = clean_price(price_text, category)
        if price:
            title_el = await page.query_selector('h1')
            title = (await title_el.inner_text() if title_el else f"{brand} {model}")
            return {"price": price, "url": croma_url, "title": title[:120]}
        else:
            print(f"    [Croma] Found URL but no valid price (raw: {price_text})")

    except Exception as e:
        print(f"    [Croma ERR] {e}")
    return result


# ══════════════════════════════════════════════════════════
# AMAZON
# ══════════════════════════════════════════════════════════
async def scrape_amazon(page: Page, model: str, brand: str, category: str) -> dict:
    result = {"price": None, "url": None, "title": None}
    try:
        q = f"{brand}+{model}".replace(' ', '+')
        await page.goto(f"https://www.amazon.in/s?k={q}", wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        if "captcha" in (await page.title()).lower():
            return {"price": None, "url": None, "title": "CAPTCHA"}

        for item in await page.query_selector_all('[data-asin]:not([data-asin=""])'):
            title_el = await item.query_selector('.a-size-medium, .a-size-base-plus, h2 span')
            if not title_el: continue
            item_title = await title_el.inner_text()
            if not (brand_match(brand, item_title) and model_match(model, item_title)): continue
            price_el = await item.query_selector('.a-price .a-offscreen')
            if price_el:
                price = clean_price(await price_el.inner_text(), category)
                if price:
                    link = await item.query_selector('h2 a, .a-link-normal')
                    href = await link.get_attribute('href') if link else None
                    url = f"https://www.amazon.in{href}" if href and href.startswith('/') else href
                    # Extract ASIN from URL
                    asin = None
                    asin_match_obj = re.search(r'/dp/([A-Z0-9]{10})', url or '')
                    if asin_match_obj:
                        asin = asin_match_obj.group(1)
                    return {"price": price, "url": url, "title": item_title[:100], "asin": asin}
    except Exception as e:
        print(f"    [Amazon ERR] {e}")
    return result


# ══════════════════════════════════════════════════════════
# FLIPKART
# ══════════════════════════════════════════════════════════
async def scrape_flipkart(page: Page, model: str, brand: str, category: str) -> dict:
    result = {"price": None, "url": None, "title": None}
    try:
        q = f"{brand}+{model}".replace(' ', '+')
        await page.goto(f"https://www.flipkart.com/search?q={q}", wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2500)
        for sel in ['button._2KpZ6l._2doB4z', 'button[class*="close"]']:
            try:
                btn = await page.query_selector(sel)
                if btn: await btn.click(); break
            except: pass

        links = await page.query_selector_all('a.k7wcnx, [data-id] a[href*="/p/"]')
        matched_url, matched_title = None, None
        for link_el in links[:5]:
            href = await link_el.get_attribute('href') or ''
            img  = await link_el.query_selector('img')
            alt  = await img.get_attribute('alt') if img else ''
            full_text = alt + ' ' + href
            if brand_match(brand, full_text) and (model_match(model, full_text) or model_match(model, alt)):
                matched_url   = f"https://www.flipkart.com{href}" if href.startswith('/') else href
                matched_title = alt
                break

        if not matched_url: return result

        await page.goto(matched_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)

        price_text = await page.evaluate("""() => {
            function* walk(node) {
                if (node.nodeType === 3) yield node.textContent;
                else for (const c of node.childNodes) yield* walk(c);
            }
            for (const t of walk(document.body)) {
                const s = t.trim();
                if (/^₹[\\d,]{5,10}$/.test(s)) return s;
            }
            for (const sel of ['div._30jeq3','div.Nx9bqj','._3I9_wc','div._16Jk6d']) {
                const el = document.querySelector(sel);
                if (el && el.innerText.includes('₹')) return el.innerText.trim();
            }
            return null;
        }""")
        price = clean_price(price_text, category)
        if price:
            return {"price": price, "url": matched_url, "title": (matched_title or '')[:100]}
    except Exception as e:
        print(f"    [Flipkart ERR] {e}")
    return result


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════
async def main():
    models   = load_models()
    progress = load_progress()
    done     = set(progress.keys())

    print(f"{'='*65}")
    print(f"MereWalaPrice — Price Scraper v5  |  Pin: {BHOPAL_PIN} (Bhopal)")
    print(f"Platforms: Amazon | Flipkart | Croma")
    print(f"Models: {len(models)} | Already done: {len(done)}")
    print(f"Started: {datetime.datetime.now().strftime('%d %b %Y %H:%M:%S')}")
    print(f"{'='*65}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="en-IN", timezone_id="Asia/Kolkata"
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await ctx.new_page()

        # One-time: set Bhopal pin on Croma
        print("Setting Bhopal pin code on Croma...")
        await croma_set_pincode(page)
        print()

        for i, m in enumerate(models):
            key = f"{m['brand']}_{m['model']}"
            cat = m['category']

            if key in done:
                ex = progress[key]
                missing = [p for p in ['amazon','flipkart','croma']
                           if not ex['prices'].get(p, {}).get('price')]
                if not missing:
                    print(f"[{i+1:>2}/{len(models)}] SKIP ✓  {m['brand']} {m['model']}")
                    continue
                # Fill missing platforms
                print(f"\n[{i+1:>2}/{len(models)}] Fill-in ({', '.join(missing)}): {m['brand']} {m['model']}")
                for plat in missing:
                    if plat == 'amazon':
                        r = await scrape_amazon(page, m['model'], m['brand'], cat)
                    elif plat == 'flipkart':
                        r = await scrape_flipkart(page, m['model'], m['brand'], cat)
                    elif plat == 'croma':
                        r = await scrape_croma(page, m['model'], m['brand'], cat)
                    pr = r['price']
                    print(f"    {plat}: {'₹'+f'{pr:,}' if pr else 'Not found'}")
                    progress[key]['prices'][plat] = r
                    await asyncio.sleep(1)
                save_progress(progress)
                continue

            print(f"\n[{i+1:>2}/{len(models)}] {m['brand']} — {m['model']} ({cat})")
            rec = {
                "brand": m["brand"], "category": cat,
                "model": m["model"], "name": m["name"],
                "company_url": m.get("company_url"),
                "scraped_at": datetime.datetime.now().isoformat(),
                "prices": {
                    "amazon":   {"price": None, "url": None, "title": None, "asin": None},
                    "flipkart": {"price": None, "url": None, "title": None},
                    "croma":    {"price": None, "url": None, "title": None},
                    "reliance": {"price": None, "url": None,
                                 "title": "Cannot scrape — server blocks all bots"},
                }
            }

            print(f"  Amazon...")
            rec["prices"]["amazon"]   = await scrape_amazon(page, m["model"], m["brand"], cat)
            a = rec["prices"]["amazon"]["price"]
            print(f"    {'₹'+f'{a:,}' if a else 'Not found'}")
            await asyncio.sleep(1)

            print(f"  Flipkart...")
            rec["prices"]["flipkart"] = await scrape_flipkart(page, m["model"], m["brand"], cat)
            f = rec["prices"]["flipkart"]["price"]
            print(f"    {'₹'+f'{f:,}' if f else 'Not found'}")
            await asyncio.sleep(1)

            print(f"  Croma (Bhopal 462001)...")
            rec["prices"]["croma"]    = await scrape_croma(page, m["model"], m["brand"], cat)
            c = rec["prices"]["croma"]["price"]
            print(f"    {'₹'+f'{c:,}' if c else 'Not found'}")
            await asyncio.sleep(1)

            progress[key] = rec
            save_progress(progress)
            hits = sum(1 for x in [a, f, c] if x)
            print(f"  → [{hits}/3]  total: {len(progress)}/{len(models)}")

            if (i+1) % 8 == 0:
                print(f"\n  ── cool-down 5s ──\n")
                await asyncio.sleep(5)

        await browser.close()

    # Final output
    final = list(progress.values())
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*75}")
    print(f"✅ COMPLETE — {len(final)} models — {datetime.datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*75}")
    print(f"\n{'Brand':<12} {'Model':<24} {'Cat':<6} {'Amazon':>10} {'Flipkart':>10} {'Croma':>10}")
    print("─"*75)
    for r in final:
        def p(x): return f"₹{x:,}" if x else "—"
        print(f"{r['brand']:<12} {r['model']:<24} {r['category']:<6} "
              f"{p(r['prices']['amazon']['price']):>10} "
              f"{p(r['prices']['flipkart']['price']):>10} "
              f"{p(r['prices']['croma']['price']):>10}")

    a2 = sum(1 for r in final if r['prices']['amazon']['price'])
    f2 = sum(1 for r in final if r['prices']['flipkart']['price'])
    c2 = sum(1 for r in final if r['prices']['croma']['price'])
    print(f"\nHit rate → Amazon: {a2}/{len(final)} | Flipkart: {f2}/{len(final)} | Croma: {c2}/{len(final)}")

if __name__ == "__main__":
    asyncio.run(main())
