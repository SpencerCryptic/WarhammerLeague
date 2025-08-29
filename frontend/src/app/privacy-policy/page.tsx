'use client';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: January 2025</p>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <div className="text-gray-300 space-y-2">
              <p><strong>Email:</strong> <a href="mailto:contact@crypticcabin.com" className="text-orange-400 hover:text-orange-300">contact@crypticcabin.com</a></p>
              <p><strong>Address:</strong> Cryptic Cabin LTD, 11D, Moss End Garden Village, Warfield RG42 6EJ, United Kingdom</p>
            </div>
          </section>

          {/* Collecting Personal Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Collecting Personal Information</h2>
            <p className="text-gray-300 mb-4">
              When you visit our league platform, we collect certain information about your device, your interaction with the platform, 
              and information necessary to process your league participation.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-orange-400 mb-2">Device Information</h3>
                <p className="text-gray-300 mb-2">
                  We collect device information to load the platform accurately for you and to perform analytics on platform usage. 
                  This includes:
                </p>
                <ul className="list-disc list-inside text-gray-300 ml-4 space-y-1">
                  <li>Web browser information</li>
                  <li>IP address</li>
                  <li>Time zone</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-orange-400 mb-2">User Account Information</h3>
                <p className="text-gray-300 mb-2">
                  To provide league services and communication, we collect:
                </p>
                <ul className="list-disc list-inside text-gray-300 ml-4 space-y-1">
                  <li>Name and email address</li>
                  <li>League participation data and match results</li>
                  <li>Faction and army list information</li>
                  <li>Tournament rankings and statistics</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-orange-400 mb-2">Support Information</h3>
                <p className="text-gray-300">
                  When you contact us for support, we collect information to help resolve your issues, 
                  including account details and support interaction history.
                </p>
              </div>
            </div>
          </section>

          {/* Minors */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Minors</h2>
            <p className="text-gray-300">
              Our league platform is not intended for individuals under the age of 18. We do not intentionally 
              collect personal information from children under 18. If you are a parent or guardian and believe 
              your child has provided us with personal information, please contact us so we can delete such information.
            </p>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Data Sharing</h2>
            <p className="text-gray-300 mb-4">We share your personal information in the following situations:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>With service providers who help us operate our league platform</li>
              <li>To comply with applicable laws, lawful requests, and legal processes</li>
              <li>For league-related communications and event announcements</li>
              <li>With other league participants for match coordination (only necessary contact information)</li>
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
            <p className="text-gray-300 mb-4">
              We use cookies and similar tracking technologies to improve your experience on our platform. 
              These include:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Functional cookies necessary for platform operation</li>
              <li>Performance cookies to analyze platform usage</li>
              <li>Authentication cookies to keep you logged in</li>
            </ul>
            <p className="text-gray-300 mt-4">
              You can manage your cookie preferences through your browser settings. We respect "Do Not Track" 
              browser settings where possible.
            </p>
          </section>

          {/* User Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct any inaccurate or incomplete information</li>
              <li>Request deletion of your personal information (subject to legal requirements)</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability for your league statistics and match history</li>
            </ul>
            <p className="text-gray-300 mt-4">
              To exercise these rights, please contact us at <a href="mailto:contact@crypticcabin.com" className="text-orange-400 hover:text-orange-300">contact@crypticcabin.com</a>.
            </p>
          </section>

          {/* Changes and Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Changes and Updates</h2>
            <p className="text-gray-300">
              We may update this privacy policy from time to time to reflect changes in our practices or for 
              legal, operational, or regulatory reasons. When we make significant changes, we will notify users 
              through the platform or via email.
            </p>
          </section>

          {/* Complaints */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Complaints</h2>
            <p className="text-gray-300">
              If you have any concerns about our privacy practices, please contact us first at{' '}
              <a href="mailto:contact@crypticcabin.com" className="text-orange-400 hover:text-orange-300">contact@crypticcabin.com</a>. 
              If you are not satisfied with our response, you have the right to file a complaint with your local 
              data protection authority.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}