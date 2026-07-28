import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy — REPLY',
  description: 'Privacy Policy for the REPLY workout app invite beta.',
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Policy explains what REPLY collects during the invite / soft-launch
        beta. Short version: data is stored locally and can sync to Supabase
        when you sign in.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">1. What data REPLY stores</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Profile info from sign-in provider (or guest profile)</li>
        <li>Preferences (gear, language, goals, theme)</li>
        <li>Workout history, favorites, and custom workout lists</li>
      </ul>
      <p>
        Guest mode stores data in browser localStorage only. Signed-in mode also
        syncs to Supabase (Auth + Postgres) to support multi-device access.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">2. What we do not collect (yet)</h2>
      <p>
        We do not run a production analytics, crash-reporting, or advertising
        SDK in this beta.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">3. Third-party content</h2>
      <p>
        Exercise images may load from a public GitHub CDN
        (<code className="rounded bg-black/5 px-1 text-[13px]">raw.githubusercontent.com</code>).
        That host may see standard network request metadata (IP, user agent)
        when images load.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">4. Hosting</h2>
      <p>
        If you access REPLY on a hosting provider (for example Vercel), that
        provider may process basic server logs (IP, URL, timestamps) under their
        own policies.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">5. Your choices</h2>
      <p>
        You can sign out, clear site data in your browser to remove local REPLY
        data, and clear history from Profile inside the app. To request account
        data deletion in Supabase-backed mode, contact the REPLY team.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">6. Children</h2>
      <p>
        REPLY is not directed at children under 16. Do not use the beta if you
        are under that age.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">7. Changes</h2>
      <p>
        We will update this Policy as infrastructure and beta scope evolve.
        Continued use after changes means you accept the updated Policy.
      </p>
    </LegalShell>
  );
}
