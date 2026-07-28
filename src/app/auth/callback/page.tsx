'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/screens/loading-screen';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        router.replace('/');
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Hash/token flows: let client parse the URL.
          await supabase.auth.getSession();
        }
        if (!cancelled) router.replace('/?auth=1');
      } catch {
        if (!cancelled) {
          setMessage('Sign-in failed. Redirecting…');
          window.setTimeout(() => router.replace('/'), 1200);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <LoadingScreen message={message} />
    </div>
  );
}
