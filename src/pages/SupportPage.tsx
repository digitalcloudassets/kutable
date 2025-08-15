import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare,
  HelpCircle as HelpCircleIcon,
  Phone, 
  Mail, 
  Clock, 
  HelpCircle, 
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  ExternalLink,
  Book,
  CreditCard,
  Users,
  Settings,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FAQ {
  question: string;
  answer: string;
  category: 'general' | 'booking' | 'payment' | 'barber' | 'technical';
}

const SupportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const faqs: FAQ[] = [
    {
      question: "How do I book an appointment?",
      answer: "Simply browse our barber directory, select a barber you like, choose a service and available time slot, then complete your booking with secure payment. You'll receive instant SMS confirmation.",
      category: "booking"
    },
    {
      question: "Can I cancel or reschedule my appointment?",
      answer: "Yes! You can cancel appointments up to 24 hours in advance directly from your dashboard. For rescheduling, please contact your barber directly or cancel and rebook for a new time.",
      category: "booking"
    },
    {
      question: "How do payments work?",
      answer: "We use Stripe for secure payment processing. You pay the service price set by your barber with no additional booking fees. Payments are processed immediately upon booking confirmation.",
      category: "payment"
    },
    {
      question: "Is my payment information secure?",
      answer: "Absolutely. We use bank-level encryption and are PCI compliant. Your payment information is processed securely through Stripe and never stored on our servers.",
      category: "payment"
    },
    {
      question: "How do I claim my barber profile?",
      answer: "Kutable is now an invite-only platform for barbers. We're expanding our network of verified professionals. Contact us to learn about joining the platform.",
      category: "barber"
    },
    {
      question: "What fees do barbers pay?",
      answer: "Barbers pay only when they earn. There's a total fee per transaction: 1% platform fee (minimum $0.25) + ~3% payment processing. No monthly fees, setup costs, or contracts.",
      category: "barber"
    },
    {
      question: "Do I need to create an account to book?",
      answer: "Yes, creating an account ensures your booking history is saved and allows us to send you confirmations and reminders. It only takes a minute to sign up.",
      category: "general"
    },
    {
      question: "What if my barber doesn't show up?",
      answer: "If your barber doesn't show up for your confirmed appointment, please contact our support team immediately. We'll work to resolve the issue and may provide a refund depending on the circumstances.",
      category: "general"
    },
    {
      question: "How do SMS notifications work?",
      answer: "After booking, you'll receive SMS confirmations and reminders. You can opt out anytime by replying STOP. Make sure to provide a valid phone number during booking.",
      category: "technical"
    },
    {
      question: "Can I see my booking history?",
      answer: "Yes! Your complete booking history is available in your dashboard. You can view past appointments, upcoming bookings, and track your spending.",
      category: "general"
    }
  ];

  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'general', label: 'General', icon: MessageSquare },
    { id: 'booking', label: 'Booking', icon: Book },
    { id: 'payment', label: 'Payments', icon: CreditCard },
    { id: 'barber', label: 'For Barbers', icon: Users },
    { id: 'technical', label: 'Technical', icon: Settings }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('submit-support-request', {
        body: {
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          category: contactForm.category,
          subject: contactForm.subject.trim(),
          message: contactForm.message.trim(),
          userId: user?.id || null
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to submit support request');
      }
    
      // Success - show confirmation
      setSubmitting(false);
      setSubmitted(true);
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
      
    } catch (error: any) {
      console.error('Support request submission error:', error);
      setSubmitting(false);
      setError(error.message || 'Failed to submit support request. Please try again.');
      
      // Scroll to error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HelpCircleIcon className="h-16 w-16 mx-auto mb-6 text-orange-500" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How Can We Help?
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Support</h2>
            <p className="text-xl text-gray-600">Choose the best way to reach us</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center bg-gray-50 rounded-lg p-6">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Platform Support</h3>
              <p className="text-gray-600 mb-4">
                <strong>For Barbers:</strong> Platform issues, account problems, or technical difficulties - email us directly and we'll respond within 24 hours.
              </p>
              <div className="text-sm text-gray-500 mb-4">
                support@kutable.com
              </div>
              <a
                href="mailto:support@kutable.com"
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors inline-block font-medium"
              >
                Send Email
              </a>
            </div>

            <div className="text-center bg-gray-50 rounded-lg p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact Barbers Directly</h3>
              <p className="text-gray-600 mb-4">
                <strong>For Clients:</strong> Appointment questions, scheduling changes, or service inquiries - contact your barber directly using their phone number on their profile page.
              </p>
              <div className="text-sm text-gray-500 mb-4">
                Find phone numbers on barber profile pages
              </div>
              <a
                href="/barbers"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
              >
                Find Barbers
              </a>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Find quick answers to common questions</p>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Browse frequently asked questions organized by category. Use the search function to quickly find answers to specific questions.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>For Barbers:</strong> Platform and technical issues - email support@kutable.com<br />
                <strong>For Clients:</strong> Appointment questions - contact your barber directly
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                  {expandedFAQ === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or contact our support team directly.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
            <p className="text-xl text-gray-600">Send us a message and we'll get back to you soon</p>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent!</h3>
              <p className="text-green-700">
                Thank you for contacting us. We'll respond within 24 hours.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="general">General Question</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment Problem</option>
                    <option value="barber">Barber Account</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Please provide as much detail as possible..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Helpful Resources</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link
              to="/how-it-works"
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <Book className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                How It Works
              </h3>
              <p className="text-gray-600 text-sm">
                Learn how to use Kutable for booking appointments and managing your business.
              </p>
              <div className="flex items-center space-x-1 mt-3 text-blue-600 group-hover:text-orange-600 transition-colors">
                <span className="text-sm font-medium">Learn more</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/pricing"
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <DollarSign className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                Pricing Guide
              </h3>
              <p className="text-gray-600 text-sm">
                Understand our transparent pricing structure for customers and barbers.
              </p>
              <div className="flex items-center space-x-1 mt-3 text-blue-600 group-hover:text-orange-600 transition-colors">
                <span className="text-sm font-medium">View pricing</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Link>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <AlertCircle className="h-8 w-8 text-yellow-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Report an Issue
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Found a bug or having technical difficulties? Let us know right away.
              </p>
              <a
                href="mailto:support@kutable.com?subject=Bug Report"
                className="text-orange-600 hover:text-orange-500 font-medium text-sm flex items-center space-x-1"
              >
                <span>Report issue</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-8 bg-red-50 border-t border-red-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Need Help?</span>
          </div>
          <p className="text-red-700 text-sm">
            For urgent booking issues: <strong>Contact your barber directly</strong> using their phone number. 
            For platform problems: <strong>Email support@kutable.com</strong>
          </p>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;