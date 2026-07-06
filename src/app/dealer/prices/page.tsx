import { createClient } from '@supabase/supabase-js';
import PricesClient from './PricesClient';

export const revalidate = 0; // Force server rendering so products are always fresh

export default async function DealerPricesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Pre-fetch all active products server-side
  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, model_number, category')
    .eq('is_active', true)
    .order('category, brand');

  return <PricesClient initialProducts={products || []} />;
}
