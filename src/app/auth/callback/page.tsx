'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/screens/loading-screen';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const SESSION_READY_RETRY_DELAYS_MS = [0, 200, 500, 1000, 1800];

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
        // OAuth (especially Google) can race with session persistence right after exchange.
        // Wait a few short retries before leaving the callback page.
        let sessionReady = false;
        for (const delayMs of SESSION_READY_RETRY_DELAYS_MS) {
          if (delayMs > 0) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            sessionReady = true;
            break;
          }
        }
        if (!sessionReady) throw new Error('Session not ready after OAuth callback');
        if (!cancelled) router.replace('/?auth=1');
      } catch (error) {
        if (!cancelled) {
          console.error('Auth callback failed', error);
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
