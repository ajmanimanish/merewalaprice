import { getSupabaseService } from '@/lib/supabase';
import ResultsDashboard from './ResultsDashboard';
import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';

interface ResultsPageProps {
  params: {
    requestId: string;
  };
  searchParams: {
    token?: string;
  };
}

export const revalidate = 0; // Results update dynamically, so disable static caching

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const token = searchParams.token;

  if (!token) {
    return <AccessDenied reason="Token missing (Access token missing in URL)." />;
  }

  const supabaseAdmin = getSupabaseService();
  
  // Call the database RPC which securely combines validations and fetches all metrics
  const { data, error } = await supabaseAdmin.rpc('get_request_details', {
    req_id: params.requestId,
    token: token
  });

  if (error || !data || !data.request) {
    console.error('RPC Error or invalid token:', error);
    return <AccessDenied reason="Kripya link check karein - ya toh link purana hai ya galat token hai (Invalid token or request link)." />;
  }

  return (
    <ResultsDashboard 
      initialData={data} 
      requestId={params.requestId} 
      token={token} 
    />
  );
}

function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-slate-50">
      <div className="p-4 bg-red-50 text-red-500 rounded-full border border-red-100 mb-6">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-xl font-extrabold text-slate-900">Access Restricted</h1>
      <p className="text-sm text-slate-600 font-medium mt-3 max-w-sm">
        {reason}
      </p>
      
      <Link href="/" className="btn-primary mt-8 py-2.5 px-6 text-sm">
        <Home className="w-4 h-4" />
        Go back to Home
      </Link>
    </div>
  );
}
