import os
import re
import asyncio
import random
import logging
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import httpx
from playwright.async_api import async_playwright

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("price-fetcher")

app = FastAPI(title="MereWalaPrice Online Price Fetcher")

# Config from Env
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Headers for Supabase API requests
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

class ScrapeRequest(BaseModel):
    product_id: str
    model_number: str
    amazon_url: Optional[str] = None
    flipkart_url: Optional[str] = None

async def save_online_price(product_id: str, platform: str, price: Optional[int], url: str, installation_cost: int, fetch_status: str = "success"):
    """Saves or updates online prices in Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase credentials missing. Skipping DB save.")
        return

    true_cost = (price + installation_cost) if price is not None else None
    payload = {
        "product_id": product_id,
        "platform": platform,
        "price": price,
        "installation_cost": installation_cost,
        "true_cost": true_cost,
        "url": url,
        "fetch_status": fetch_status,
        "fetched_at": "now()"
    }

    # Query if entry exists
    url_check = f"{SUPABASE_URL.rstrip('/')}/rest/v1/online_prices?product_id=eq.{product_id}&platform=eq.{platform}"
    
    async with httpx.AsyncClient() as client:
        try:
            check_resp = await client.get(url_check, headers=HEADERS)
            existing = check_resp.json()
            
            if existing and len(existing) > 0:
                # Update
                record_id = existing[0]["id"]
                url_update = f"{SUPABASE_URL.rstrip('/')}/rest/v1/online_prices?id=eq.{record_id}"
                await client.patch(url_update, json=payload, headers=HEADERS)
                logger.info(f"Updated {platform} price for product {product_id} with status={fetch_status}")
            else:
                # Insert
                url_insert = f"{SUPABASE_URL.rstrip('/')}/rest/v1/online_prices"
                await client.post(url_insert, json=payload, headers=HEADERS)
                logger.info(f"Inserted new {platform} price for product {product_id} with status={fetch_status}")
        except Exception as e:
            logger.error(f"Failed to save price to Supabase: {str(e)}")

async def scrape_amazon(playwright, model_number: str, url: Optional[str] = None) -> tuple[int, str]:
    """Scrapes Amazon.in for the product price."""
    browser = await playwright.chromium.launch(headless=True)
    # Set a real browser context user agent
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    
    target_url = url
    if not target_url:
        # Search Amazon IN
        search_query = f"https://www.amazon.in/s?k={model_number}"
        logger.info(f"Searching Amazon: {search_query}")
        await page.goto(search_query, timeout=15000)
        
        # Click first product link
        # Look for search results product link
        link_selector = "a.a-link-normal.s-line-clamp-2"
        await page.wait_for_selector(link_selector, timeout=5000)
        first_product = await page.query_selector(link_selector)
        
        if first_product:
            href = await first_product.get_attribute("href")
            target_url = f"https://www.amazon.in{href}"
        else:
            target_url = search_query

    logger.info(f"Navigating to Amazon Product page: {target_url}")
    await page.goto(target_url, timeout=15000)
    
    # Try multiple selectors for Amazon Price
    price = 0
    selectors = [
        "span.a-price-whole",
        "span#priceblock_ourprice",
        "span#priceblock_dealprice",
        "span.a-color-price"
    ]
    
    for selector in selectors:
        element = await page.query_selector(selector)
        if element:
            text = await element.inner_text()
            # Clean string to get integers
            clean_text = re.sub(r"[^\d]", "", text)
            if clean_text:
                price = int(clean_text)
                break
                
    await browser.close()
    if price == 0:
        raise Exception("Could not locate price on Amazon page")
    return price, target_url

async def scrape_flipkart(playwright, model_number: str, url: Optional[str] = None) -> tuple[int, str]:
    """Scrapes Flipkart.com for the product price."""
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()

    target_url = url
    if not target_url:
        search_query = f"https://www.flipkart.com/search?q={model_number}"
        logger.info(f"Searching Flipkart: {search_query}")
        await page.goto(search_query, timeout=15000)
        
        # Click first product link
        link_selector = "a.wjcEIp, a.CGtC98"
        try:
            await page.wait_for_selector(link_selector, timeout=5000)
            first_product = await page.query_selector(link_selector)
            if first_product:
                href = await first_product.get_attribute("href")
                target_url = f"https://www.flipkart.com{href}"
            else:
                target_url = search_query
        except Exception:
            target_url = search_query

    logger.info(f"Navigating to Flipkart Product page: {target_url}")
    await page.goto(target_url, timeout=15000)

    price = 0
    # Flipkart price selectors
    selectors = [
        "div.Nx9u7A",
        "div._30jeq3",
        "div.U1u1Lt font",
    ]

    for selector in selectors:
        element = await page.query_selector(selector)
        if element:
            text = await element.inner_text()
            clean_text = re.sub(r"[^\d]", "", text)
            if clean_text:
                price = int(clean_text)
                break

    await browser.close()
    if price == 0:
        raise Exception("Could not locate price on Flipkart page")
    return price, target_url

async def background_scraping_task(req: ScrapeRequest):
    """Executes the Playwright scraping in the background."""
    logger.info(f"Starting background scraping for product: {req.product_id} ({req.model_number})")
    
    # 1. Fetch category from Supabase first
    category = "AC" # default
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            url_prod = f"{SUPABASE_URL.rstrip('/')}/rest/v1/products?id=eq.{req.product_id}&select=category"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url_prod, headers=HEADERS)
                res_json = resp.json()
                if res_json and len(res_json) > 0:
                    category = res_json[0]["category"]
                    logger.info(f"Fetched product category: {category}")
        except Exception as e:
            logger.error(f"Failed to query product category: {str(e)}")

    # 2. Determine installation cost
    # ₹1200 default for AC/WM, ₹0 for others
    installation_cost = 1200 if category in ["AC", "WM"] else 0

    # 3. Scrape Amazon
    amazon_price = None
    amazon_url = req.amazon_url or f"https://www.amazon.in/s?k={req.model_number}"
    amazon_status = "success"
    
    try:
        async with async_playwright() as p:
            amazon_price, final_amz_url = await scrape_amazon(p, req.model_number, req.amazon_url)
            amazon_url = final_amz_url
    except Exception as e:
        logger.error(f"Amazon scraping failed: {str(e)}.")
        amazon_status = "failed"
        
    await save_online_price(
        product_id=req.product_id,
        platform="amazon",
        price=amazon_price,
        url=amazon_url,
        installation_cost=installation_cost,
        fetch_status=amazon_status
    )

    # 4. Scrape Flipkart
    flipkart_price = None
    flipkart_url = req.flipkart_url or f"https://www.flipkart.com/search?q={req.model_number}"
    flipkart_status = "success"
    
    try:
        async with async_playwright() as p:
            flipkart_price, final_fk_url = await scrape_flipkart(p, req.model_number, req.flipkart_url)
            flipkart_url = final_fk_url
    except Exception as e:
        logger.error(f"Flipkart scraping failed: {str(e)}.")
        flipkart_status = "failed"

    await save_online_price(
        product_id=req.product_id,
        platform="flipkart",
        price=flipkart_price,
        url=flipkart_url,
        installation_cost=installation_cost,
        fetch_status=flipkart_status
    )
    
    logger.info(f"Completed scraping task for product {req.product_id}")

@app.post("/scrape")
async def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    """Triggers the background scraper for a product."""
    if not req.product_id or not req.model_number:
        raise HTTPException(status_code=400, detail="Missing product_id or model_number")
        
    background_tasks.add_task(background_scraping_task, req)
    return {"status": "scraping_started", "product_id": req.product_id}

@app.get("/")
def read_root():
    return {"status": "online", "message": "MereWalaPrice Price Fetcher API"}

if __name__ == "__main__":
    import uvicorn
    # Read port from env, default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
