'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TrackerProps {
  productId: string;
  productName: string;
  modelNumber: string;
}

export default function ProductTracker({ productId, productName, modelNumber }: TrackerProps) {
  useEffect(() => {
    const logActivity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        // Log view
        await supabase.from('product_views').insert({
          product_id: productId,
          user_id: userId,
          city: 'Bhopal'
        });

        // Log search if logged in
        if (userId) {
          await supabase.from('user_searches').insert({
            user_id: userId,
            product_id: productId,
            search_query: `${productName} ${modelNumber}`
          });
        }
      } catch (err) {
        console.error('Failed to log product activity:', err);
      }
    };
    logActivity();
  }, [productId, productName, modelNumber]);

  return null;
}
