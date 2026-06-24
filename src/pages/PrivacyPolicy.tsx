import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPolicy() {
  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: June 2024</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              SAS EBSCOPAL ("My Butlr", "we", "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and share your personal information
              when you use our property management platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Account information (name, email, phone, company details)</li>
              <li>Property data (addresses, descriptions, photos)</li>
              <li>Reservation and guest information</li>
              <li>Payment and financial records</li>
              <li>Communications and support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Provide and improve our services</li>
              <li>Process reservations and payments</li>
              <li>Send notifications and updates</li>
              <li>Ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Supabase infrastructure hosted in the EU (eu-central-1).
              We implement appropriate technical and organizational measures to protect your data,
              including encryption in transit and at rest, row-level security policies, and regular audits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share information with service providers
              who help us operate the platform, and when required by law. Third-party integrations
              are governed by their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Your Rights (GDPR)</h2>
            <p>Under the GDPR, you have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management.
              Analytics cookies are only used with your consent.
              You can manage your cookie preferences at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at: privacy@mybutlr.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
