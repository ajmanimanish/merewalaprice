import { NextResponse } from 'next/server';
import { Client } from 'pg';

const MIGRATION_SQL = `
-- 1. Create dealer_prices table if it does not exist
CREATE TABLE IF NOT EXISTS dealer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  stock_status TEXT DEFAULT 'in_stock' 
    CHECK (stock_status IN ('in_stock', 'out_of_stock', 'limited')),
  inclusions TEXT[] DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dealer_id, product_id)
);

-- 2. Enable RLS
ALTER TABLE dealer_prices ENABLE ROW LEVEL SECURITY;

-- 3. Re-create policies safely
DROP POLICY IF EXISTS "Public can view dealer prices" ON dealer_prices;
DROP POLICY IF EXISTS "Dealers manage own prices" ON dealer_prices;

CREATE POLICY "Public can view dealer prices" ON dealer_prices 
  FOR SELECT USING (true);
CREATE POLICY "Dealers manage own prices" ON dealer_prices 
  FOR ALL USING (
    dealer_id IN (SELECT id FROM dealers WHERE auth_user_id = auth.uid())
  );

-- 4. Add special offers columns to dealer_prices
ALTER TABLE dealer_prices 
ADD COLUMN IF NOT EXISTS card_offer_text TEXT,
ADD COLUMN IF NOT EXISTS card_offer_bank TEXT,
ADD COLUMN IF NOT EXISTS card_offer_savings INTEGER,
ADD COLUMN IF NOT EXISTS emi_available BOOLEAN DEFAULT false;

-- 5. Add shop-level default offers to dealers
ALTER TABLE dealers
ADD COLUMN IF NOT EXISTS default_card_offers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emi_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS emi_banks TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS working_hours_start TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS working_hours_end TEXT DEFAULT '20:00';
`;

export async function GET(request: Request) {
  // Simple auth check via query parameter to prevent unauthorized runs
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== 'run_mwp_migration_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passwords = ['bhopalprice123', 'MWP@Admin2024'];
  const host = '2406:da12:1f1:f802:77fd:3ed:b6cb:b46d';
  const user = 'postgres';
  const database = 'postgres';
  const port = 5432;

  let success = false;
  let log: string[] = [];

  for (const pwd of passwords) {
    log.push(`Attempting connection with password starting with ${pwd.substring(0, 3)}...`);
    const client = new Client({
      user,
      host,
      database,
      password: pwd,
      port,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      log.push('Connected to PostgreSQL successfully!');
      
      log.push('Executing migration query...');
      await client.query(MIGRATION_SQL);
      log.push('Migration SQL executed successfully!');
      
      await client.end();
      success = true;
      break;
    } catch (err: any) {
      log.push(`Failed: ${err.message || err}`);
      try {
        await client.end();
      } catch (_) {}
    }
  }

  return NextResponse.json({
    success,
    log
  });
}
