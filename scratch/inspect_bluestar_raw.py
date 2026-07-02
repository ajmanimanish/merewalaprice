import httpx

url = "https://www.bluestarindia.com/sitemap.xml"
try:
    r = httpx.get(url, verify=False, timeout=20.0)
    print("Status:", r.status_code)
    print("Content-type:", r.headers.get("content-type"))
    print("Snippet:")
    print(r.text[:800])
except Exception as e:
    print("Error:", e)
