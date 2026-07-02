const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dlnaqtadwmzwlklybzkt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbmFxdGFkd216d2xrbHliemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTk5ODEsImV4cCI6MjA5ODIzNTk4MX0.9hWWlPLVjh1GhsK0w_S4-e8xSjYPonCYIkS4YrM6h8o";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, brand, model_number, name, category, specs,
      online_prices (platform, price),
      dealer_prices (price, stock_status, dealers(shop_name, area, is_approved))
    `)
    .eq('category', 'AC')
    .eq('is_active', true);

  if (error) console.error("ERROR:", error);
  else console.log("DATA LENGTH:", data ? data.length : 0);
}
run();
