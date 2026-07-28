import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Health Disclaimer — REPLY',
  description: 'Health and safety disclaimer for the REPLY workout app.',
};

export default function DisclaimerPage() {
  return (
    <LegalShell title="Health disclaimer">
      <p>
        REPLY helps you discover and log workouts. It is <strong>not</strong> a
        medical device, personal trainer, physical therapist, or doctor.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">Consult a professional</h2>
      <p>
        Talk to a qualified clinician before starting a new exercise program,
        especially if you have injuries, joint pain, cardiovascular conditions,
        are pregnant, or have any other health concerns.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">Train within your limits</h2>
      <p>
        Stop if you feel sharp pain, dizziness, chest discomfort, or unusual
        shortness of breath. Recommendations and swap suggestions are heuristic
        — they can be wrong for your body, equipment, or recovery.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">No outcome guarantees</h2>
      <p>
        Muscle gain, fat loss, strength, or consistency results are not
        guaranteed. You assume the risks of physical training when using REPLY.
      </p>

      <h2 className="text-[17px] font-semibold text-[var(--black,#111)]">Emergency</h2>
      <p>
        If you think you are having a medical emergency, call local emergency
        services immediately. Do not rely on this app for crisis or medical
        guidance.
      </p>
    </LegalShell>
  );
}
