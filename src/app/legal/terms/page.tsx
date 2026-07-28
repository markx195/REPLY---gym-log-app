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
        without notice. Sign-in options (Google, Apple, Facebook, email) are
        <strong> local demo sessions</strong> stored only on your device — they
        are not linked to real OAuth accounts yet.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">2. Local-only data</h2>
      <p>
        Workout history, preferences, and favorites are saved in your browser
        (localStorage). Clearing site data, switching browsers, or using another
        device will not sync your progress. We do not currently operate a cloud
        account system.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">3. Acceptable use</h2>
      <p>
        Use REPLY for personal fitness planning and logging. Do not abuse the
        service, attempt to disrupt it, or misrepresent that demo sign-in is a
        verified identity provider login.
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
        liable for lost local data, training outcomes, injuries, or downtime
        during the beta.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">7. Contact</h2>
      <p>
        For beta feedback or legal questions, contact the REPLY team via the
        channel that invited you.
      </p>
    </LegalShell>
  );
}
