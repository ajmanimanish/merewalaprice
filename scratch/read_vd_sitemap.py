import httpx
import xml.etree.ElementTree as ET

url = "https://www.samsung.com/in/vd-sitemap.xml"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print(f"Fetching sitemap: {url}...")
try:
    r = httpx.get(url, headers=headers, timeout=90.0)
    if r.status_code == 200:
        print(f"Success! Parsing XML ({len(r.content)} bytes)...")
        root = ET.fromstring(r.content)
        ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        
        urls = []
        for url_tag in root.findall("ns:url", ns):
            loc = url_tag.find("ns:loc", ns)
            if loc is not None:
                urls.append(loc.text)
                
        print(f"Total URLs found in vd-sitemap: {len(urls)}")
        print("\nFirst 30 URLs:")
        for u in urls[:30]:
            print(" -", u)
    else:
        print("Failed to fetch, Status code:", r.status_code)
except Exception as e:
    print("Error:", e)
