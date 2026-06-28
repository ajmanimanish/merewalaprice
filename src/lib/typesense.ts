import Typesense from 'typesense';
import { supabase } from './supabase';

const typesenseHost = process.env.TYPESENSE_HOST || '';
const typesenseApiKey = process.env.TYPESENSE_API_KEY || '';

let typesenseClient: any = null;

if (typesenseHost && typesenseApiKey) {
  let host = typesenseHost;
  let port = 443;
  let protocol = 'https';

  if (host.includes('://')) {
    const parts = host.split('://');
    protocol = parts[0];
    host = parts[1];
  }
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    port = parseInt(parts[1], 10);
  }

  typesenseClient = new Typesense.Client({
    nodes: [
      {
        host,
        port,
        protocol,
      },
    ],
    apiKey: typesenseApiKey,
    connectionTimeoutSeconds: 3,
  });
}

export interface SearchProduct {
  id: string;
  name: string;
  brand: string;
  category: 'AC' | 'TV' | 'FRIDGE' | 'WM' | 'LAPTOP';
  model_number: string;
  image_url?: string;
  amazon_url?: string;
  flipkart_url?: string;
}

/**
 * Searches the product catalog.
 * Tries Typesense first, falls back to direct Postgres query if unconfigured or fails.
 */
export async function searchProducts(query: string): Promise<SearchProduct[]> {
  const cleanQuery = query?.trim() || '';
  console.log('searchProducts called with cleanQuery:', cleanQuery);
  console.log('typesenseClient is:', typesenseClient ? 'defined' : 'null');

  if (!cleanQuery) {
    // Return a default set of products if no query is present
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .limit(10);
    
    if (error) {
      console.error('Error fetching default products:', error.message, error.details);
      return [];
    }
    return (data || []) as SearchProduct[];
  }

  // Wrap the entire Typesense block in a try-catch to ensure we always fall through to Supabase
  try {
    if (typesenseClient) {
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: cleanQuery,
          query_by: 'name,brand,model_number,category',
          per_page: 10,
        });

      if (searchResults.hits && searchResults.hits.length > 0) {
        console.log('Typesense search results:', searchResults.hits.length, 'products found');
        return searchResults.hits.map((hit: any) => hit.document as SearchProduct);
      } else {
        console.log('Typesense search returned 0 hits, falling through to Supabase...');
      }
    }
  } catch (error) {
    console.error('Typesense search block error, falling back to Supabase:', error);
  }

  // Fallback: search Supabase products
  console.log('Executing Supabase fallback query...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${cleanQuery}%,brand.ilike.%${cleanQuery}%,model_number.ilike.%${cleanQuery}%`)
    .limit(10);

  if (error) {
    console.error('Supabase search error:', error.message, error.details);
    return [];
  }

  console.log('Supabase search results:', data?.length, 'products found');
  return (data || []) as SearchProduct[];
}
