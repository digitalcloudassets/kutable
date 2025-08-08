import React from 'react';
import { FileText, Scale, Shield, Users, CreditCard, AlertTriangle } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Scale className="h-16 w-16 mx-auto mb-6 text-orange-500" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            The terms and conditions governing your use of the Kutable platform.
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
            {/* Acceptance */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="h-6 w-6 text-orange-500 mr-2" />
                Acceptance of Terms
              </h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing or using the Kutable platform ("Platform"), you agree to be bound by these 
                Terms of Service ("Terms"). If you disagree with any part of these terms, you may not 
                access the Platform. These Terms apply to all visitors, users, customers, and barbers 
                who access or use the Platform.
              </p>
            </div>

            {/* Platform Description */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Description</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Kutable is a marketplace platform that connects customers with professional barbers. 
                Our Platform facilitates:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">For Customers</h3>
                  <ul className="space-y-1 text-gray-600 text-sm">
                    <li>• Discovering and booking barber services</li>
                    <li>• Secure payment processing</li>
                    <li>• Appointment management</li>
                    <li>• Review and rating system</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">For Barbers</h3>
                  <ul className="space-y-1 text-gray-600 text-sm">
                    <li>• Online booking management</li>
                    <li>• Payment collection and processing</li>
                    <li>• Customer communication tools</li>
                    <li>• Business analytics and reporting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* User Accounts */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="h-6 w-6 text-orange-500 mr-2" />
                User Accounts and Registration
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Creation</h3>
                  <p className="text-gray-600 leading-relaxed">
                    To use certain features of the Platform, you must register for an account. 
                    You agree to provide accurate, current, and complete information during registration 
                    and to update such information as necessary.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Security</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• You are responsible for maintaining the confidentiality of your password</li>
                    <li>• You must notify us immediately of any unauthorized access to your account</li>
                    <li>• You are responsible for all activities that occur under your account</li>
                    <li>• We reserve the right to suspend accounts that violate these Terms</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Barber Verification</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Barbers must verify their identity and business information when claiming profiles. 
                    Providing false information may result in account suspension or termination.
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking and Appointment Terms</h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">For Customers</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li>• Bookings are confirmed upon successful payment</li>
                    <li>• Cancellations must be made at least 24 hours in advance</li>
                    <li>• Late cancellations may result in forfeited deposits</li>
                    <li>• No-shows may be charged the full service amount</li>
                    <li>• Rescheduling is subject to barber availability</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="font-semibold text-orange-900 mb-3">For Barbers</h3>
                  <ul className="space-y-2 text-orange-800 text-sm">
                    <li>• You must honor confirmed bookings or face account penalties</li>
                    <li>• Service quality and pricing are your responsibility</li>
                    <li>• You must maintain professional standards and licensing</li>
                    <li>• Cancellations should be communicated promptly to customers</li>
                    <li>• Profile information must be accurate and up-to-date</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-6 w-6 text-orange-500 mr-2" />
                Payment Terms
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Payments</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• All payments are processed securely through Stripe</li>
                    <li>• Payment is due at the time of booking</li>
                    <li>• Refunds are subject to the barber's cancellation policy</li>
                    <li>• Disputes should be reported within 7 days of service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Barber Payments</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Platform fee: 1% of each transaction</li>
                    <li>• Payment processing fees: ~2.9% + $0.30 per transaction</li>
                    <li>• Payments are deposited to your connected bank account</li>
                    <li>• You are responsible for tax reporting and compliance</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1">Important Note</h4>
                      <p className="text-yellow-700 text-sm">
                        Kutable is a platform that facilitates transactions between customers and barbers. 
                        We are not responsible for the quality of services provided by individual barbers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prohibited Uses */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Uses</h2>
              <p className="text-gray-600 mb-6">
                You may not use the Platform for any unlawful purpose or in any way that could damage, 
                disable, or impair the Platform. Prohibited activities include:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Providing false or misleading information</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Attempting to circumvent payment systems</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Harassing or abusing other users</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Violating any applicable laws or regulations</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Posting inappropriate content or reviews</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Attempting to hack or disrupt the Platform</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Using automated tools to scrape data</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="bg-red-500 w-2 h-2 rounded-full mt-2"></div>
                    <span className="text-gray-600 text-sm">Creating multiple accounts to circumvent restrictions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property</h2>
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  The Platform and its original content, features, and functionality are and will remain 
                  the exclusive property of Kutable and its licensors. The Platform is protected by 
                  copyright, trademark, and other laws.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">User-Generated Content</h3>
                  <p className="text-gray-600 text-sm">
                    By uploading photos, writing reviews, or providing other content, you grant Kutable 
                    a non-exclusive, worldwide, royalty-free license to use, display, and distribute 
                    such content in connection with the Platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimers */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="h-6 w-6 text-orange-500 mr-2" />
                Disclaimers and Limitation of Liability
              </h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">Service Disclaimer</h3>
                    <p className="text-yellow-700 text-sm leading-relaxed">
                      Kutable is a marketplace platform. We do not provide barber services directly. 
                      All services are provided by independent barbers. We make no warranties about 
                      the quality, safety, or legality of services provided by barbers on our Platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Platform "As Is"</h3>
                <p className="text-gray-600 leading-relaxed">
                  The Platform is provided on an "as is" and "as available" basis. We make no 
                  representations or warranties of any kind, express or implied, regarding the 
                  operation of the Platform or the information, content, or materials included therein.
                </p>

                <h3 className="text-lg font-semibold text-gray-900">Limitation of Liability</h3>
                <p className="text-gray-600 leading-relaxed">
                  To the fullest extent permitted by law, Kutable shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages, including without limitation, 
                  loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </div>
            </div>

            {/* User Responsibilities */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Responsibilities</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Responsibilities</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start space-x-2">
                      <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Provide accurate booking information</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Arrive on time for appointments</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Follow cancellation policies</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Treat barbers with respect</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-blue-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Provide honest, helpful reviews</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Barber Responsibilities</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start space-x-2">
                      <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Maintain valid business licenses</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Provide professional services</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Honor confirmed bookings</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Maintain accurate profile information</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="bg-orange-500 w-2 h-2 rounded-full mt-2"></div>
                      <span className="text-sm">Comply with health and safety regulations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cancellation and Refunds */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancellation and Refunds</h2>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Cancellations</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• <strong>24+ hours notice:</strong> Full refund minus payment processing fees</li>
                    <li>• <strong>Less than 24 hours:</strong> Deposit may be forfeited, contact barber directly</li>
                    <li>• <strong>No-show:</strong> Full charge may apply, barber's discretion</li>
                    <li>• <strong>Emergency cancellations:</strong> Reviewed case-by-case</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Barber Cancellations</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• Barbers must provide reasonable notice when cancelling</li>
                    <li>• Customers receive full refunds for barber-initiated cancellations</li>
                    <li>• Repeated cancellations may result in account suspension</li>
                    <li>• Emergency situations are handled individually</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy and Data Protection */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy and Data Protection</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your privacy is important to us. Our collection and use of personal information 
                is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Key Points:</strong> We use your information only to provide services, 
                    never sell your data, and employ bank-level security to protect your information.
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">Communication Consent</h3>
                  <p className="text-green-700 text-sm">
                    By creating an account, you provide express written consent to receive transactional 
                    emails and SMS messages related to your bookings. You can opt out of marketing 
                    communications while keeping essential service notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Communication Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Communication and Notifications</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">SMS Program Terms</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">SMS Consent Required</h4>
                        <p className="text-yellow-700 text-sm">
                          By providing your phone number and consenting during registration, you agree to receive 
                          SMS messages related to your Kutable account and bookings.
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• <strong>Message Frequency:</strong> Varies based on your booking activity. Typically 1-3 messages per booking.</li>
                    <li>• <strong>Message Types:</strong> Booking confirmations, appointment reminders, and important account updates.</li>
                    <li>• <strong>Opt-out:</strong> Reply "STOP" to any message to unsubscribe from all SMS communications.</li>
                    <li>• <strong>Help:</strong> Reply "HELP" for customer support information.</li>
                    <li>• <strong>Carrier Charges:</strong> Standard message and data rates may apply from your carrier.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Email Communications</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• <strong>Transactional Emails:</strong> Account creation, booking confirmations, payment receipts, and security alerts</li>
                    <li>• <strong>Marketing Emails:</strong> Platform updates, new features, and promotional content (opt-out available)</li>
                    <li>• <strong>Unsubscribe:</strong> Use the unsubscribe link in any marketing email or contact support</li>
                    <li>• <strong>Essential Communications:</strong> Some emails related to your account security and bookings cannot be opted out of</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Consent Management */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Communication Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">SMS Preferences</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• <strong>Opt-out:</strong> Text "STOP" to any Kutable SMS</li>
                    <li>• <strong>Re-opt-in:</strong> Text "START" or "UNSTOP" to resume</li>
                    <li>• <strong>Help:</strong> Text "HELP" for support information</li>
                    <li>• <strong>Contact Support:</strong> Email us at support@kutable.com</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Email Preferences</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• <strong>Dashboard Settings:</strong> Update preferences in your account</li>
                    <li>• <strong>Unsubscribe Links:</strong> Click unsubscribe in any marketing email</li>
                    <li>• <strong>Contact Support:</strong> Email privacy@kutable.com</li>
                    <li>• <strong>Account Deletion:</strong> Removes all communication preferences</li>
                  </ul>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
                <p className="text-blue-800 text-sm">
                  <strong>Important:</strong> Even if you opt out of marketing communications, you will still 
                  receive essential transactional messages related to your bookings and account security. 
                  These are necessary for the proper functioning of the service.
                </p>
              </div>
            </div>

            {/* Termination */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Termination</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Voluntary Termination</h3>
                  <p className="text-gray-600 text-sm">
                    You may terminate your account at any time by contacting support or 
                    deactivating your profile in your dashboard settings.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Involuntary Termination</h3>
                  <p className="text-gray-600 text-sm">
                    We reserve the right to suspend or terminate accounts that violate these Terms, 
                    engage in fraudulent activity, or pose risks to other users.
                  </p>
                </div>
              </div>
            </div>

            {/* Governing Law */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms shall be interpreted and enforced in accordance with the laws of the 
                State of Delaware, without regard to conflict of law principles. Any disputes 
                arising from these Terms will be resolved in the courts of Delaware.
              </p>
            </div>

            {/* Changes to Terms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of 
                significant changes via email or prominent notice on the Platform. Your continued 
                use of the Platform after changes constitutes acceptance of the new Terms.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About These Terms?</h2>
              <p className="text-gray-600 mb-6">
                If you have any questions about these Terms of Service, please contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:legal@kutable.com"
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Email Legal Team
                </a>
                <a
                  href="/support"
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </a>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-500 text-sm">
                  <strong>Kutable LLC</strong><br />
                  Wilmington, Delaware<br />
                  Legal: legal@kutable.com<br />
                  Support: support@kutable.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfServicePage;