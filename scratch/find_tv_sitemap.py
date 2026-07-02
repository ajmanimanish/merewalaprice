import httpx

urls = [
    "https://www.samsung.com/in/vd-sitemap.xml",
    "https://www.samsung.com/in/tv-sitemap.xml",
    "https://www.samsung.com/in/tvs-sitemap.xml",
    "https://www.samsung.com/in/home-entertainment-sitemap.xml",
    "https://www.samsung.com/in/monitors-sitemap.xml",
    "https://www.samsung.com/in/vd-monitors-sitemap.xml"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for url in urls:
    try:
        r = httpx.get(url, headers=headers)
        print(f"Status {r.status_code} for: {url}")
        if r.status_code == 200:
            print(f"  -> SUCCESS! Found active sitemap of size: {len(r.content)} bytes.")
    except Exception as e:
        print(f"Error testing {url}: {e}")
