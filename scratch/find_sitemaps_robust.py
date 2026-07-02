import httpx

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
}

client = httpx.Client(headers=headers, follow_redirects=True, timeout=20.0)

test_targets = [
    {"brand": "LG Sitemap", "url": "https://www.lg.com/in/sitemap.xml"},
    {"brand": "Daikin Redirect Test", "url": "https://www.daikinindia.com/sitemap.xml"},
    {"brand": "Daikin robots.txt", "url": "https://www.daikinindia.com/robots.txt"},
    {"brand": "Whirlpool robots.txt", "url": "https://www.whirlpoolindia.com/robots.txt"},
    {"brand": "Voltas robots.txt", "url": "https://www.voltas.com/robots.txt"},
    {"brand": "MyVoltas robots.txt", "url": "https://www.myvoltas.com/robots.txt"}
]

for t in test_targets:
    try:
        r = client.get(t["url"])
        print(f"{t['brand']} -> Status {r.status_code} | Redirected to: {r.url} | Bytes: {len(r.content)}")
        if "robots.txt" in t["url"] and r.status_code == 200:
            sitemaps = [line for line in r.text.split("\n") if line.lower().startswith("sitemap:")]
            print("  Sitemaps in robots.txt:")
            for s in sitemaps:
                print("   -", s)
    except Exception as e:
        print(f"{t['brand']} -> Error: {e}")
