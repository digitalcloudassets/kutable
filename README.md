# Kutable - Professional Barber Booking Platform

A modern, mobile-first web application built exclusively for barbers and their clients. Kutable provides a seamless booking experience with integrated payments, SMS notifications, and comprehensive business management tools.

## 🚀 Features

### For Customers
- **Public Barber Profiles**: Browse verified barber profiles with galleries, reviews, and services
- **Instant Booking**: Real-time availability and instant appointment booking
- **Secure Payments**: Integrated Stripe payments with deposit options
- **SMS Notifications**: Booking confirmations and reminders via Twilio
- **Client Dashboard**: Manage bookings, view history, and track appointments

### For Barbers
- **Profile Claiming**: Easy claim flow with Stripe Connect onboarding
- **Admin Dashboard**: Complete business management with revenue tracking
- **Service Management**: Define services, pricing, deposits, and durations
- **Media Gallery**: Upload images and videos using Supabase storage
- **Availability Management**: Set working hours and manage time slots
- **Revenue Analytics**: Track earnings and export data for custom date ranges

### For Platform Admins
- **Comprehensive Oversight**: Monitor all barbers, appointments, and revenue
- **Profile Management**: Track claimed vs unclaimed profiles
- **Analytics Dashboard**: Booking volume, earnings, and Stripe Connect accounts

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe Connect with 1% platform fee
- **SMS**: Twilio integration
- **Deployment**: Netlify (mobile-first responsive design)

## 📱 Design Philosophy

- **Mobile-First**: Optimized for mobile devices with desktop-responsive design
- **iOS-Level Polish**: Clean, professional interface with smooth animations
- **Professional Color Scheme**: Black/dark gray base with vibrant orange (#FF6B35) accents
- **User Experience Focus**: Intuitive flows for both barbers and customers

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account
- Twilio account (for SMS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kutable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase, Stripe, and Twilio credentials.

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration files in `/supabase/migrations/`
   - Set up storage buckets for media uploads

5. **Configure Stripe Connect**
   - Set up Stripe Connect in your Stripe dashboard
   - Configure webhooks for payment events

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- `barber_profiles` - Barber information and claim status
- `services` - Service offerings with pricing and duration
- `bookings` - Appointments and payment tracking
- `client_profiles` - Customer information
- `gallery_media` - Images and videos for barber profiles
- `availability` - Barber schedules and time slots
- `reviews` - Customer feedback and ratings
- `stripe_accounts` - Stripe Connect metadata
- `platform_transactions` - Revenue and fee tracking

## 💰 Pricing Model

- **No Cost for Profiles**: Free to create and maintain barber profiles
- **Transaction-Based Fees**: 1% platform fee + Stripe fees (2.9% + $0.30) on customer transactions
- **Transparent Pricing**: Combined fee display to avoid confusion

## 🔐 Security Features

- **Row Level Security (RLS)**: Comprehensive data protection policies
- **Secure Authentication**: Supabase Auth with email/password
- **Payment Security**: PCI-compliant Stripe integration
- **Media Upload Security**: Secure file handling with Supabase Storage

## 📞 Communication Features

- **SMS Notifications**: Booking confirmations and reminders via Twilio
- **Email Integration**: Database-triggered email confirmations
- **Real-time Updates**: Live booking status updates

## 🚀 Deployment

The application is designed for Netlify deployment with:
- Mobile-first responsive design
- Optimized build process
- Environment variable management
- Continuous deployment from Git

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Email: support@kutable.com
- Phone: 1-800-KUTABLE

---

Built with ❤️ for the barber community