import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Footer } from './Footer';

export function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-4">
          <a href="#" className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="Next Ignition Logo"
              className="h-6 lg:h-8 cursor-pointer"
              onClick={() => window.location.hash = '#'}
            />
          </a>
          <a
            href="#"
            onClick={() => (window.location.hash = '#')}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: brandColors.electricBlue }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 9, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. What Are Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in 
                your web browser and allows the Service or a third-party to recognize you and make your next visit easier and 
                the Service more useful to you.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your personal computer or mobile 
                device when you go offline, while session cookies are deleted as soon as you close your web browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. How NextIgnition Uses Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies 
                for the following purposes:
              </p>
              
              <h3 className="text-xl font-bold mb-3 mt-6">Essential Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use essential cookies to authenticate users and prevent fraudulent use of user accounts. These cookies are 
                necessary for the Service to function properly.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Preference Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use preference cookies to remember your preferences and various settings. This helps us provide you with a 
                more personalized experience and saves you time by not having to re-enter your preferences every time you visit.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Analytics Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use analytics cookies to track information about how the Service is used so that we can make improvements. 
                These cookies collect information about how visitors use our website, such as which pages they visit most often 
                and if they receive error messages from web pages.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Advertising Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These cookies are used to make advertising messages more relevant to you. They perform functions like preventing 
                the same ad from continuously reappearing, ensuring that ads are properly displayed, and in some cases selecting 
                advertisements that are based on your interests.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the 
                Service and deliver advertisements on and through the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Some of the third-party services we use include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Google Analytics - to understand how visitors interact with our website</li>
                <li>Social Media Platforms - to enable social sharing and interactions</li>
                <li>Advertising Networks - to deliver targeted advertisements</li>
                <li>Payment Processors - to securely process payments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. What Are Your Choices Regarding Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help 
                pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might 
                not be able to use all of the features we offer, you may not be able to store your preferences, and some of our 
                pages might not display properly.
              </p>
              
              <h3 className="text-xl font-bold mb-3 mt-6">For Chrome</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Visit: <a 
                  href="https://support.google.com/chrome/answer/95647" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline"
                  style={{ color: brandColors.electricBlue }}
                >
                  Chrome Cookie Settings
                </a>
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">For Firefox</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Visit: <a 
                  href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline"
                  style={{ color: brandColors.electricBlue }}
                >
                  Firefox Cookie Settings
                </a>
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">For Safari</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Visit: <a 
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline"
                  style={{ color: brandColors.electricBlue }}
                >
                  Safari Cookie Settings
                </a>
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">For Edge</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Visit: <a 
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline"
                  style={{ color: brandColors.electricBlue }}
                >
                  Edge Cookie Settings
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Do Not Track Signals</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We respect Do Not Track ("DNT") signals and do not track, plant cookies, or use advertising when a DNT browser 
                mechanism is in place. DNT is a preference you can set in your web browser to inform websites that you do not 
                want to be tracked.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can enable or disable Do Not Track by visiting the Preferences or Settings page of your web browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Cookie Consent</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using our Service, you consent to the use of cookies as described in this Cookie Policy. When you first visit 
                our website, you will be presented with a cookie consent banner that allows you to accept or decline non-essential 
                cookies.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can change your cookie preferences at any time by accessing the cookie settings through the link in our footer 
                or by clearing your browser cookies and revisiting our site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Changes to This Cookie Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie 
                Policy on this page and updating the "Last updated" date at the top of this Cookie Policy.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are advised to review this Cookie Policy periodically for any changes. Changes to this Cookie Policy are 
                effective when they are posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. More Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For more information about cookies, including how to see what cookies have been set and how to manage and delete 
                them, visit <a 
                  href="https://www.allaboutcookies.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline"
                  style={{ color: brandColors.electricBlue }}
                >
                  www.allaboutcookies.org
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed">
                Email: <a href="mailto:privacy@nextignition.com" className="underline" style={{ color: brandColors.electricBlue }}>
                  privacy@nextignition.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}