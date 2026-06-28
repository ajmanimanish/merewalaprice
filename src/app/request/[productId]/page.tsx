import { getSupabaseService } from '@/lib/supabase';
import RequestForm from './RequestForm';
import { notFound } from 'next/navigation';

interface RequestPageProps {
  params: {
    productId: string;
  };
}

export const revalidate = 0; // Disable caching to ensure fresh product data loads

export default async function RequestPage({ params }: RequestPageProps) {
  const supabaseAdmin = getSupabaseService();
  
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.productId)
    .single();

  if (error || !product) {
    notFound();
  }

  return <RequestForm product={product} />;
}
