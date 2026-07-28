import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Terms of Service — REPLY',
  description: 'Terms of Service for the REPLY workout app invite beta.',
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        Welcome to REPLY. These Terms govern your use of the REPLY web app
        during the invite / soft-launch beta. By continuing you agree to these
        Terms and our Privacy Policy.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">1. Beta product</h2>
      <p>
        REPLY is an early product. Features may change, break, or be removed
        without notice. Sign-in options (Google and email magic link) use
        Supabase Auth during this beta. Guest mode remains local on your device.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">2. Data storage and sync</h2>
      <p>
        REPLY stores workout data locally in your browser and, for signed-in
        users, syncs preferences, history, custom lists, and favorites to our
        Supabase backend. Guest sessions stay local-only. Clearing browser data
        can remove local copies.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">3. Acceptable use</h2>
      <p>
        Use REPLY for personal fitness planning and logging. Do not abuse the
        service, attempt to disrupt it, or misrepresent account identity.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">4. Health &amp; safety</h2>
      <p>
        Training recommendations are rule-based suggestions, not medical advice.
        See our <a className="font-semibold text-[var(--accent,#0071e3)]" href="/legal/disclaimer">Health disclaimer</a>.
        You are responsible for training safely and within your limits.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">5. Intellectual property</h2>
      <p>
        REPLY branding and app UI are owned by the project operators. Exercise
        catalog images and names may come from third-party open datasets; we do
        not claim ownership of those assets.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">6. Disclaimer of warranty</h2>
      <p>
        The app is provided “as is” without warranties of any kind. We are not
        liable for lost data, training outcomes, injuries, or downtime during
        the beta.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">7. Contact</h2>
      <p>
        For beta feedback or legal questions, contact the REPLY team via the
        channel that invited you.
      </p>
    </LegalShell>
  );
}
