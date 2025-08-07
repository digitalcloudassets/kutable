import React from 'react';
import { Shield, Eye, Lock, Database, Users, Mail, MessageSquare, AlertTriangle } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-6 text-orange-500" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Your privacy is important to us. Learn how we protect and use your information.
          </p>
          <p className="text-gray-400 mt-4">
            Last updated: January 1, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Eye className="h-6 w-6 text-orange-500 mr-2" />
                Introduction
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Kutable ("we," "our," or "us") operates the Kutable platform that connects customers with 
                professional barbers. This Privacy Policy explains how we collect, use, disclose, and 
                safeguard your information when you use our website, mobile application, and related services.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Database className="h-6 w-6 text-orange-500 mr-2" />
                Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• <strong>Account Information:</strong> Name, email address, phone number, password</li>
                    <li>• <strong>Profile Information:</strong> Profile photos, business information (for barbers)</li>
                    <li>• <strong>Contact Preferences:</strong> Communication method preferences (SMS, email, phone)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Information</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Appointment dates, times, and service details</li>
                    <li>• Special requests and notes for appointments</li>
                    <li>• Booking history and preferences</li>
                    <li>• Reviews and ratings you provide</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Payment method details (processed securely through Stripe)</li>
                    <li>• Billing address and transaction history</li>
                    <li>• Bank account information (for barbers receiving payments)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Information</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Device information and IP address</li>
                    <li>• Browser type and operating system</li>
                    <li>• Usage data and platform analytics</li>
                    <li>• Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-6 w-6 text-orange-500 mr-2" />
                How We Use Your Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full mt-1">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Service Delivery</h3>
                    <p className="text-gray-600">
                      Process bookings, facilitate payments, send confirmations and reminders, 
                      and enable communication between customers and barbers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Lock className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Account Management</h3>
                    <p className="text-gray-600">
                      Create and manage your account, authenticate your identity, 
                      and provide customer support.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-full mt-1">
                    <Mail className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Communication</h3>
                    <p className="text-gray-600">
                      Send you important updates about your bookings, account changes, 
                      and occasionally inform you about new features.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-orange-100 p-2 rounded-full mt-1">
                    <Database className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Platform Improvement</h3>
                    <p className="text-gray-600">
                      Analyze usage patterns to improve our services, develop new features, 
                      and ensure platform security and performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Sharing */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="h-6 w-6 text-orange-500 mr-2" />
                Information Sharing
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                We do not sell, trade, or rent your personal information to third parties. 
                We may share your information only in the following circumstances:
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Service Providers</h3>
                  <p className="text-gray-600 text-sm">
                    With trusted third-party services that help us operate the platform 
                    (payment processing, SMS delivery, hosting, analytics).
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Barbers and Customers</h3>
                  <p className="text-gray-600 text-sm">
                    We share necessary booking information between customers and barbers 
                    to facilitate appointments (name, contact info, appointment details).
                  </p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Legal Requirements</h3>
                  <p className="text-gray-600 text-sm">
                    When required by law, court order, or to protect our rights and the safety of our users.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Lock className="h-6 w-6 text-orange-500 mr-2" />
                Data Security
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                We implement industry-standard security measures to protect your personal information:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Encryption</h3>
                  <p className="text-green-700 text-sm">
                    All data is encrypted in transit and at rest using bank-level SSL encryption.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Secure Storage</h3>
                  <p className="text-blue-700 text-sm">
                    Data is stored on secure servers with regular security audits and monitoring.
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">Payment Security</h3>
                  <p className="text-purple-700 text-sm">
                    We're PCI DSS compliant and use Stripe for secure payment processing.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-2">Access Control</h3>
                  <p className="text-orange-700 text-sm">
                    Strict access controls ensure only authorized personnel can access your data.
                  </p>
                </div>
              </div>
            </div>

            {/* Your Rights */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
              <p className="text-gray-600 mb-6">You have the following rights regarding your personal information:</p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Access and Portability</h3>
                  <p className="text-gray-600 text-sm">
                    Request a copy of your personal data and export your booking history from your dashboard.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Correction and Updates</h3>
                  <p className="text-gray-600 text-sm">
                    Update your profile information, contact details, and preferences anytime from your account settings.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Deletion</h3>
                  <p className="text-gray-600 text-sm">
                    Request deletion of your account and associated data. Note that some information may be retained for legal or business purposes.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Communication Preferences</h3>
                  <p className="text-gray-600 text-sm">
                    Control how and when we contact you. Opt out of marketing communications while keeping important booking notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Cookies and Tracking */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
              <p className="text-gray-600 mb-6">
                We use cookies and similar technologies to improve your experience on our platform:
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Cookie Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Essential</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Authentication, security, basic functionality</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Session/1 year</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Analytics</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Understand usage patterns and improve our service</td>
                      <td className="px-4 py-3 text-sm text-gray-600">2 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Preferences</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Remember your settings and preferences</td>
                      <td className="px-4 py-3 text-sm text-gray-600">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Third-Party Services */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-600 mb-6">
                We work with trusted third-party providers to deliver our services:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Stripe</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Handles all payment processing and barber payouts securely.
                  </p>
                  <a 
                    href="https://stripe.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-500 text-sm font-medium"
                  >
                    View Stripe Privacy Policy →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Twilio</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Sends SMS confirmations and appointment reminders.
                  </p>
                  <a 
                    href="https://www.twilio.com/legal/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-500 text-sm font-medium"
                  >
                    View Twilio Privacy Policy →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Supabase</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Provides secure database and authentication services.
                  </p>
                  <a 
                    href="https://supabase.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-500 text-sm font-medium"
                  >
                    View Supabase Privacy Policy →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Google Maps</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Displays location information and directions to barber shops.
                  </p>
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-500 text-sm font-medium"
                  >
                    View Google Privacy Policy →
                  </a>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-600 mb-6">
                We retain your information for as long as necessary to provide our services:
              </p>
              
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                  <span><strong>Active accounts:</strong> Data is retained while your account is active</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="bg-green-500 w-2 h-2 rounded-full mt-2"></div>
                  <span><strong>Closed accounts:</strong> Most data is deleted within 90 days of account closure</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                  <span><strong>Legal requirements:</strong> Some data may be retained longer for compliance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="bg-purple-500 w-2 h-2 rounded-full mt-2"></div>
                  <span><strong>Reviews and ratings:</strong> May be retained for platform integrity</span>
                </li>
              </ul>
            </div>

            {/* Your Choices */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Choices</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">You can control your privacy by:</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>• Updating your profile and contact preferences in your dashboard</li>
                  <li>• Choosing your preferred communication method (SMS, email, phone)</li>
                  <li>• Opting out of marketing communications while keeping booking notifications</li>
                  <li>• Controlling cookie preferences in your browser settings</li>
                  <li>• Requesting data export or account deletion by contacting support</li>
                </ul>
              </div>
            </div>

            {/* Children's Privacy */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13. If you believe we have collected 
                information from a child under 13, please contact us immediately.
              </p>
            </div>

            {/* International Users */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">International Users</h2>
              <p className="text-gray-600 leading-relaxed">
                Kutable is based in the United States. If you are accessing our services from outside 
                the United States, please be aware that your information may be transferred to, stored, 
                and processed in the United States where our servers are located.
              </p>
            </div>

            {/* Changes to Privacy Policy */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                For significant changes, we may also send you an email notification.
              </p>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About This Policy?</h2>
              <p className="text-gray-600 mb-6">
                If you have any questions about this Privacy Policy or our privacy practices, 
                please don't hesitate to contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:privacy@kutable.com"
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Email Privacy Team
                </a>
                <a
                  href="/support"
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;