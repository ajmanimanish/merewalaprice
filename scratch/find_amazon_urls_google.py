import httpx
from bs4 import BeautifulSoup
import urllib.parse
import re

queries = [
    "Blue Star IE518PNU site:amazon.in",
    "Voltas 185V DZW site:amazon.in",
    "LG PS-Q19YNZE site:amazon.in",
    "Samsung UA43CUE60AKLXL site:amazon.in",
    "Samsung WW70T4020EE site:amazon.in"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def search_google(query):
    print(f"Searching Google for: '{query}'...")
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
    r = httpx.get(url, headers=headers)
    if r.status_code != 200:
        print(f"Google blocked search (Status {r.status_code})")
        return None
        
    soup = BeautifulSoup(r.text, 'html.parser')
    links = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if "amazon.in" in href and "/dp/" in href:
            # Clean url
            m = re.search(r'(https://www\.amazon\.in/[^&\?]+)', href)
            if m:
                links.append(m.group(1))
            else:
                links.append(href)
    return links

for q in queries:
    links = search_google(q)
    print("Found links:", links)
    print("-" * 40)
