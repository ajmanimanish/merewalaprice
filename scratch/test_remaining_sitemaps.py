import httpx

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

client = httpx.Client(headers=headers, follow_redirects=True, timeout=20.0)

urls = [
    {"brand": "Voltas Products Sitemap", "url": "https://www.voltas.com/sitemap_products_1.xml"},
    {"brand": "Voltas Pages Sitemap", "url": "https://www.voltas.com/sitemap_pages_1.xml"},
    {"brand": "Whirlpool Sitemap XML", "url": "https://www.whirlpoolindia.com/sitemap.xml"}
]

for item in urls:
    try:
        r = client.get(item["url"])
        print(f"{item['brand']} -> Status {r.status_code} | Bytes: {len(r.content)}")
    except Exception as e:
        print(f"{item['brand']} -> Error: {e}")
