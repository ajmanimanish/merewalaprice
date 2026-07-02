const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dlnaqtadwmzwlklybzkt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbmFxdGFkd216d2xrbHliemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTk5ODEsImV4cCI6MjA5ODIzNTk4MX0.9hWWlPLVjh1GhsK0w_S4-e8xSjYPonCYIkS4YrM6h8o";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: dbProducts, error: err1 } = await supabase
    .from('products')
    .select(`
      id,
      brand,
      model_number,
      name,
      category,
      specs,
      online_prices (
        platform,
        price
      ),
      dealer_prices (
        price,
        stock_status,
        dealers (
          shop_name,
          area,
          is_approved
        )
      )
    `)
    .eq('category', 'AC')
    .eq('is_active', true);

  if (err1) {
    console.error("ERROR:", err1);
    return;
  }
  
  if (!dbProducts) {
    console.log("No data returned");
    return;
  }

  try {
    const cards = dbProducts.map((p) => {
      const onlinePrices = p.online_prices || [];
      const dealerPrices = (p.dealer_prices || []).filter(
        (dp) => dp.dealers?.is_approved
      );
      
      const lowestOnline = onlinePrices.length > 0
        ? Math.min(...onlinePrices.map((o) => o.price).filter(Boolean))
        : 0;

      const lowestDealer = dealerPrices.length > 0
        ? Math.min(...dealerPrices.map((d) => d.price).filter(Boolean))
        : 0;

      const lowestPrice = lowestDealer || lowestOnline || 0;
      const saving = lowestDealer && lowestOnline && lowestDealer < lowestOnline
        ? lowestOnline - lowestDealer
        : 0;

      const onlinePlatform = onlinePrices[0]?.platform || 'Online';
      const dealersCount = dealerPrices.length;

      return {
        id: p.id,
        brand: p.brand,
        model_number: p.model_number,
        name: p.name || p.model_number,
        category: p.category,
        specs: p.specs || {},
        lowest_price: lowestPrice,
        online_price: lowestOnline,
        online_platform: onlinePlatform,
        dealers_count: dealersCount,
        saving: saving,
      };
    });
    console.log("MAPPED CARDS LENGTH:", cards.length);
  } catch (e) {
    console.error("MAPPING EXCEPTION:", e);
  }
}
run();
