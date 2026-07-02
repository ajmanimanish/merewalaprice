import httpx

url = "https://www.samsung.com/in/robots.txt"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

r = httpx.get(url, headers=headers)
if r.status_code == 200:
    for line in r.text.split("\n"):
        if line.lower().startswith("sitemap:"):
            print(line.strip())
else:
    print("Failed to fetch robots.txt, Status code:", r.status_code)
