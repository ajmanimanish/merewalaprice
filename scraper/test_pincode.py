"""
Test pin code setting on Croma and Reliance Digital,
then scrape one product each to confirm prices load correctly.
Pin code: 462001 (Bhopal)
"""
import asyncio, json, re
from playwright.async_api import async_playwright

BHOPAL_PIN = "462001"

async def set_croma_pincode(page, pin):
    """Set Bhopal pin code on Croma to get local prices."""
    try:
        # Click the pincode button/link
        for sel in ['[class*="pincode"]', '[class*="Pincode"]', 'button[class*="pin"]', 
                    'a[class*="pin"]', '.pin-code', '#pincodeInput', '[placeholder*="pincode"]',
                    '[placeholder*="Pincode"]', 'text=Add Pincode', 'text=Update pincode']:
            el = await page.query_selector(sel)
            if el:
                await el.click()
                await page.wait_for_timeout(1000)
                break
        
        # Type pin code in input
        for inp_sel in ['input[placeholder*="incode"]', 'input[placeholder*="PIN"]',
                        'input[type="tel"]', 'input[type="number"]', 'input[maxlength="6"]']:
            inp = await page.query_selector(inp_sel)
            if inp:
                await inp.fill(pin)
                await page.wait_for_timeout(500)
                # Press Enter or click Apply
                await inp.press('Enter')
                await page.wait_for_timeout(1500)
                print(f"  [Croma] Pin code {pin} entered via {inp_sel}")
                return True
        print("  [Croma] Could not find pin input")
    except Exception as e:
        print(f"  [Croma] Pin error: {e}")
    return False

async def set_reliance_pincode(page, pin):
    """Set Bhopal pin code on Reliance Digital."""
    try:
        for sel in ['[class*="pincode"]', '[class*="location"]', 'button[class*="Location"]',
                    '.location-selector', '[data-testid*="location"]', 'text=Find a store',
                    '[placeholder*="pincode"]', '[placeholder*="PIN"]']:
            el = await page.query_selector(sel)
            if el:
                await el.click()
                await page.wait_for_timeout(1000)
                break

        for inp_sel in ['input[placeholder*="incode"]', 'input[placeholder*="PIN"]',
                        'input[type="tel"]', 'input[maxlength="6"]']:
            inp = await page.query_selector(inp_sel)
            if inp:
                await inp.fill(pin)
                await page.wait_for_timeout(500)
                await inp.press('Enter')
                await page.wait_for_timeout(1500)
                print(f"  [Reliance] Pin code {pin} entered via {inp_sel}")
                return True
        print("  [Reliance] Could not find pin input")
    except Exception as e:
        print(f"  [Reliance] Pin error: {e}")
    return False

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN", timezone_id="Asia/Kolkata"
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await ctx.new_page()

        # ── TEST CROMA with pin code ──
        print("\n=== CROMA: Product page with Bhopal pin code ===")
        url = "https://www.croma.com/samsung-ar60-5-in-1-convertible-1-5-ton-3-star-inverter-split-smart-ac-with-voice-assistant-2026-model-copper-condenser-ar60h19d13wnna-/p/320456"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(4000)

        print("  Setting Bhopal pin code...")
        # Check if there's a pincode widget visible
        pin_info = await page.evaluate("""() => {
            const allText = document.body.innerText.substring(0, 300);
            const pinEl = document.querySelector('[class*="pincode"], [class*="Pincode"], [class*="pin-code"]');
            const pinBtn = document.querySelector('button');
            const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                type: i.type, placeholder: i.placeholder, maxlength: i.maxLength, name: i.name
            }));
            return { 
                bodyTop: allText, 
                pinEl: pinEl ? pinEl.className : null,
                inputs: inputs.slice(0,5)
            };
        }""")
        print(f"  Body top: {pin_info['bodyTop'][:200]}")
        print(f"  Pin element class: {pin_info['pinEl']}")
        print(f"  Inputs: {pin_info['inputs']}")

        # Try clicking "Add Pincode" text
        try:
            add_pin = await page.get_by_text("Add Pincode").first
            if add_pin:
                await add_pin.click()
                await page.wait_for_timeout(2000)
                print("  Clicked 'Add Pincode'")
                
                # Now look for input
                inp = await page.query_selector('input[maxlength="6"], input[placeholder*="incode"], input[type="tel"]')
                if inp:
                    await inp.fill(BHOPAL_PIN)
                    await page.wait_for_timeout(500)
                    await inp.press("Enter")
                    await page.wait_for_timeout(2000)
                    print(f"  Entered pin: {BHOPAL_PIN}")
                    
                    # Get price after pin set
                    price_after = await page.evaluate("""() => {
                        const el = document.querySelector('span.amount, .new-price');
                        return el ? el.innerText.trim() : null;
                    }""")
                    print(f"  Price after pin set: {price_after}")
        except Exception as e:
            print(f"  Add Pincode click: {e}")

        # Dump what's clickable near top
        top_clickables = await page.evaluate("""() => {
            return Array.from(document.querySelectorAll('button, a')).slice(0,20).map(el => ({
                tag: el.tagName,
                text: (el.innerText||'').trim().substring(0,50),
                cls: el.className.substring(0,60)
            }));
        }""")
        print(f"\n  Top clickable elements:")
        for el in top_clickables[:15]:
            print(f"    {el['tag']} | {el['text']} | {el['cls']}")

        # ── TEST RELIANCE DIGITAL ──
        print("\n\n=== RELIANCE DIGITAL: Search with pin approach ===")
        # Try their search page with a direct approach
        await page.goto("https://www.reliancedigital.in/", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(4000)

        rd_info = await page.evaluate("""() => {
            return {
                title: document.title,
                bodyTop: document.body.innerText.substring(0, 400),
                inputs: Array.from(document.querySelectorAll('input')).map(i => ({
                    type: i.type, placeholder: i.placeholder, name: i.name, id: i.id
                })).slice(0,8),
                links: Array.from(document.querySelectorAll('a[href*="air-conditioner"], a[href*="conditioner"]')).slice(0,5).map(a => ({
                    href: a.href, text: (a.innerText||'').trim().substring(0,50)
                }))
            };
        }""")
        print(f"RD Title: {rd_info['title']}")
        print(f"RD Body: {rd_info['bodyTop'][:300]}")
        print(f"RD Inputs: {rd_info['inputs']}")
        print(f"RD AC links: {rd_info['links']}")

        # Try setting location
        try:
            loc_el = await page.get_by_text("Mumbai").first
            if loc_el:
                await loc_el.click()
                await page.wait_for_timeout(2000)
                print("  Clicked location")
                inp = await page.query_selector('input[placeholder*="incode"], input[placeholder*="PIN"], input[maxlength="6"]')
                if inp:
                    await inp.fill(BHOPAL_PIN)
                    await inp.press("Enter")
                    await page.wait_for_timeout(2000)
                    print(f"  Set pin to {BHOPAL_PIN}")
        except Exception as e:
            print(f"  Location click: {e}")

        # Try Reliance Digital product search via their search
        print("\n  Trying RD search for Voltas AC...")
        await page.goto("https://www.reliancedigital.in/search?q=Voltas+123INV", wait_until="networkidle", timeout=35000)
        await page.wait_for_timeout(5000)
        await page.evaluate("window.scrollTo(0, 800)")
        await page.wait_for_timeout(3000)

        rd_search = await page.evaluate("""() => {
            const body = document.body.innerText;
            const rupee = body.match(/₹[\\s]?[\\d,]+/g) || [];
            return {
                title: document.title,
                url: location.href,
                bodySnippet: body.substring(0, 500),
                rupeeTexts: rupee.slice(0, 10),
                html_snippet: document.body.innerHTML.substring(0, 2000)
            };
        }""")
        print(f"  RD Search title: {rd_search['title']}")
        print(f"  RD Search URL: {rd_search['url']}")
        print(f"  RD Rupee texts: {rd_search['rupeeTexts']}")
        print(f"  RD Body snippet: {rd_search['bodySnippet'][:300]}")

        print("\n\nDone! Closing in 10s...")
        await asyncio.sleep(10)
        await browser.close()

asyncio.run(main())
