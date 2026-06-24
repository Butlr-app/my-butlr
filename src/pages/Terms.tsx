import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function Terms() {
  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: June 2024</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using My Butlr ("the Service"), operated by SAS EBSCOPAL,
              you agree to be bound by these Terms of Service. If you do not agree,
              please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>
              My Butlr is a property management platform designed for luxury stays.
              The Service provides tools for managing properties, reservations, guests,
              services, contracts, invoices, and team collaboration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Account Registration</h2>
            <p>
              You must provide accurate and complete information when creating an account.
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code or content</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data and Content</h2>
            <p>
              You retain ownership of all data you upload to the Service.
              By using the Service, you grant us a limited license to process your data
              as necessary to provide the Service. We handle your data in accordance
              with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service.
              We may perform maintenance, updates, or modifications that temporarily affect availability.
              We will provide reasonable notice when possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SAS EBSCOPAL shall not be liable
              for any indirect, incidental, special, or consequential damages arising
              from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Termination</h2>
            <p>
              Either party may terminate the agreement at any time. Upon termination,
              you may request export of your data within 30 days. After that period,
              your data may be deleted in accordance with our retention policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of France.
              Any disputes shall be submitted to the exclusive jurisdiction of the courts of Paris.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at: legal@mybutlr.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
