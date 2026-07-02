import httpx

urls = [
    {"brand": "LG", "url": "https://www.lg.com/in/sitemap.xml"},
    {"brand": "LG Index", "url": "https://www.lg.com/in/sitemap-index.xml"},
    {"brand": "Haier", "url": "https://www.haier.com/in/sitemap.xml"},
    {"brand": "Haier Index", "url": "https://www.haier.com/in/sitemap_index.xml"},
    {"brand": "BlueStar", "url": "https://www.bluestarindia.com/sitemap.xml"},
    {"brand": "BlueStar Index", "url": "https://www.bluestarindia.com/sitemap_index.xml"},
    {"brand": "Daikin", "url": "https://www.daikinindia.com/sitemap.xml"},
    {"brand": "Daikin Index", "url": "https://www.daikinindia.com/sitemap_index.xml"},
    {"brand": "Whirlpool", "url": "https://www.whirlpoolindia.com/sitemap.xml"},
    {"brand": "Whirlpool Index", "url": "https://www.whirlpoolindia.com/sitemap_index.xml"},
    {"brand": "Voltas Products", "url": "https://www.voltas.com/sitemap_products_1.xml"}
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for item in urls:
    try:
        r = httpx.get(item["url"], headers=headers, timeout=15.0)
        print(f"{item['brand']} -> Status {r.status_code} | Bytes: {len(r.content)}")
    except Exception as e:
        print(f"{item['brand']} -> Error: {e}")
