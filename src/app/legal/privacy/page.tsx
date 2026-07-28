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
        beta. Short version: <strong>almost everything stays on your device</strong>.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">1. What we store on your device</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Demo profile (name / email you typed, or guest mode)</li>
        <li>Preferences (gear, language, goals, theme)</li>
        <li>Workout history and favorites</li>
      </ul>
      <p>
        These use browser localStorage. We do not sync them to a REPLY server
        today.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">2. What we do not collect (yet)</h2>
      <p>
        We do not run a production analytics, crash-reporting, or advertising
        SDK in this beta. Demo “Continue with Google / Apple / Facebook” does
        <strong> not</strong> send credentials to those providers.
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
        Sign out and clear site data in your browser to remove local REPLY data.
        You can also clear history from Profile inside the app.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">6. Children</h2>
      <p>
        REPLY is not directed at children under 16. Do not use the beta if you
        are under that age.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">7. Changes</h2>
      <p>
        We will update this Policy when we add real accounts, cloud sync, or
        analytics. Continued use after changes means you accept the updated
        Policy.
      </p>
    </LegalShell>
  );
}
