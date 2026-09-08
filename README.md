# MeraWalaPrice

A reverse-marketplace for appliance shopping in Bhopal. Instead of hunting through listings, a buyer describes what they want (product, budget, area, urgency) and gets back real-time online prices plus offers from local dealers — no account required to browse or request.

## What it does

A buyer submits a request for a product (AC, TV, fridge, washing machine, laptop). That request does two things at once: it kicks off a live scrape of Amazon/Flipkart for current prices on that product, and it becomes visible to approved local dealers whose category and city match. Dealers submit offers (price, what's included, availability, alternate model suggestions), and the buyer sees scraped online prices and dealer offers side by side on a results page, accessed via a private link/token rather than a login.

Dealers sign up and go through manual admin approval before they can see requests or list prices; approval triggers a WhatsApp welcome message. Dealers also maintain a standing price list independent of any specific request.

## Tech stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Auth for dealers, Row Level Security for category/city-scoped visibility)
- A separate FastAPI + Playwright scraper service for live online prices
- Wati for WhatsApp notifications

## Running it locally

```bash
npm install
npm run dev
```

Env vars needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TYPESENSE_HOST`, `TYPESENSE_API_KEY`, `WATI_ENDPOINT`, `WATI_API_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SCRAPER_URL`.

The scraper is a separate service:
```bash
cd scraper
pip install -r requirements.txt
python main.py
```

## The interesting part

The asymmetric trust model: buyers stay fully anonymous (a random access token gates their request/results page, no signup needed), while dealers go through real auth plus manual admin approval before they can see or respond to anything. That's paired with triggering the price scrape live, per request, rather than running a nightly batch crawl — it trades a few seconds of scrape latency for prices that are actually current at the moment someone's shopping.

## Status

The most actively developed repo in this portfolio — 36+ commits over about 10 weeks, with the core buyer/dealer/admin flow working end to end. One thing worth knowing if you look at the repo: `scratch/` contains ~60 files of exploratory scraping/catalog-building scripts from building out the initial product database — they're not part of the running app and are due for a cleanup pass.
