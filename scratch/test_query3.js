const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dlnaqtadwmzwlklybzkt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbmFxdGFkd216d2xrbHliemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTk5ODEsImV4cCI6MjA5ODIzNTk4MX0.9hWWlPLVjh1GhsK0w_S4-e8xSjYPonCYIkS4YrM6h8o";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('dealer_prices')
    .select('*')
    .limit(1);
    
  if (error) console.error("ERROR 3:", error);
  else console.log("DATA LENGTH 3:", data ? data.length : 0);
}
run();
