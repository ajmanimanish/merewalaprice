import { createClient } from '@supabase/supabase-js';
import CategoryClient from './CategoryClient';

const catMap: Record<string, string> = {
  ac: 'AC', tv: 'TV', wm: 'WM', fridge: 'FRIDGE', laptop: 'LAPTOP',
};

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const categoryCode = catMap[params.category.toLowerCase()] || params.category.toUpperCase();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, brand, model_number, name, category, specs, image_url,
      online_prices ( platform, price )
    `)
    .eq('category', categoryCode)
    .eq('is_active', true);

  const { data: bankOffers } = await supabase
    .from('bank_offers')
    .select('*')
    .eq('is_active', true);

  return (
    <CategoryClient
      initialProducts={products || []}
      bankOffers={bankOffers || []}
      categoryCode={categoryCode}
    />
  );
}
