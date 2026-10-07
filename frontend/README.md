# Backlyst - Modern Backlink Building Platform

**Scale Your Backlinks Without The Hassle**

A modern, full-featured SaaS platform built with Next.js that revolutionizes SEO backlink outreach. Backlyst connects content creators seeking backlinks with website owners looking to monetize their platforms in a seamless, friction-free environment.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Architecture & Design](#architecture--design)
- [Feature Overview](#feature-overview)
- [Development Guidelines](#development-guidelines)
- [Deployment](#deployment)

---

## 🎯 Project Overview

**Backlyst** is a two-sided marketplace platform that enables:

- **Providers** (Website Owners): Monetize their backlink opportunities
- **Requesters** (Content Creators/Marketers): Access quality backlink opportunities at scale

### Key Benefits

- Automated task-based workflow for requesting and delivering backlinks
- Real-time messaging and collaboration between providers and requesters
- Credit-based transaction system with flexible pricing tiers
- Comprehensive analytics and performance tracking
- Secure verification system for website ownership
- Subscription management and wallet functionality

---

## 🛠️ Tech Stack

### Frontend Framework

- **Next.js 16.1.6** - React framework for production with App Router
- **React 19.2.3** - UI library
- **TypeScript 5** - Type-safe JavaScript

### UI & Styling

- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Headless UI components library
  - `@radix-ui/react-accordion` - Accessible accordion component
  - `@radix-ui/react-avatar` - Avatar component
  - `@radix-ui/react-slot` - Slot composition component
- **Lucide React 0.574.0** - Icon library (700+ icons)
- **Heroicons 2.2.0** - Beautiful SVG icons
- **Framer Motion 12.34.1** - Animation library for smooth UX

### Utility Libraries

- **class-variance-authority** - CSS-in-JS type-safe class management
- **clsx 2.1.1** - Utility for conditional className composition
- **tailwind-merge** - Merge Tailwind CSS classes without conflicts

### Routing & Navigation

- **React Router DOM 7.13.0** - Client-side routing (Note: May be integrated alongside Next.js)

### Development Tools

- **ESLint 9** - Code quality and style enforcement
- **TypeScript** - Static type checking

---

## 📁 Project Structure

```
next-frontend/
├── app/                            # Next.js App Router
│   ├── (auth)/                    # Authentication routes
│   │   └── auth/
│   │       ├── login/             # User login page
│   │       ├── register/          # User registration page
│   │       ├── forgot-password/   # Password recovery
│   │       └── verify*/           # Multi-step verification pages
│   │
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── provider/              # Provider dashboard
│   │   │   ├── opportunities/     # Available backlink opportunities
│   │   │   ├── messages/          # Messaging system
│   │   │   ├── tasks/             # Task management
│   │   │   ├── subscription/      # Subscription management
│   │   │   ├── wallet/            # Payment & wallet features
│   │   │   └── websites/          # Website management
│   │   │
│   │   └── requester/             # Requester dashboard
│   │       ├── messages/          # Messaging system
│   │       ├── providers/         # Provider discovery
│   │       ├── settings/          # Account settings
│   │       ├── subscription/      # Plan management
│   │       ├── tasks/             # Created tasks
│   │       ├── wallet/            # Credit management
│   │       └── websites/          # Website registry
│   │
│   ├── (landingPage)/             # Public landing page routes
│   │   ├── page.tsx               # Home page
│   │   ├── how-it-works/          # How Backlyst works
│   │   └── layout.tsx             # Landing page layout
│   │
│   ├── layout.tsx                 # Root layout with providers
│   ├── globals.css                # Global styles
│   ├── not-found.tsx              # 404 error page
│   └── next-env.d.ts              # Next.js types
│
├── components/                    # Reusable React components
│   ├── auth/                      # Authentication UI
│   │   └── verify/               # Email/ownership verification components
│   │       ├── VerifyOwnershipPage.tsx
│   │       ├── VerifySiteDetailsPage.tsx
│   │       └── VerifySuccessPage.tsx
│   │
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── Header.tsx            # Dashboard header
│   │   ├── ConnectWebsiteModal.tsx
│   │   ├── NotificationPopover.tsx
│   │   ├── MetricStats.tsx       # Statistics display
│   │   ├── provider/             # Provider-specific components
│   │   │   ├── delivery/        # Delivery management
│   │   │   └── opportunity/     # Opportunity components
│   │   ├── requester/            # Requester-specific components
│   │   ├── settings/             # Settings pages
│   │   │   ├── AccountSettings.tsx
│   │   │   ├── SecuritySettings.tsx
│   │   │   ├── NotificationSettings.tsx
│   │   │   ├── WebsiteSettings.tsx
│   │   │   ├── CreditsSettings.tsx
│   │   │   ├── OrganizationSettings.tsx
│   │   │   ├── LegalSettings.tsx
│   │   │   └── ReferralsSettings.tsx
│   │   └── subscription/         # Subscription UI
│   │       ├── PricingCard.tsx
│   │       ├── FreePlanCard.tsx
│   │       └── SubscriptionPage.tsx
│   │
│   ├── landing/                  # Landing page sections
│   │   ├── Hero.tsx              # Hero section
│   │   ├── Features.tsx           # Features showcase
│   │   ├── Navbar.tsx             # Navigation bar
│   │   ├── Pricing.tsx            # Pricing section
│   │   ├── FAQSection.tsx         # FAQ accordion
│   │   ├── ProcessSection.tsx    # How it works
│   │   ├── EfficiencySection.tsx # Value proposition
│   │   ├── StepProcess.tsx       # Step-by-step guide
│   │   ├── LogoCloud.tsx         # Logo showcase
│   │   ├── BuiltForTeams.tsx     # Team benefits
│   │   └── FinalCTA.tsx          # Call-to-action
│   │
│   ├── shared/                   # Common components across app
│   │   ├── DashboardHeader.tsx   # Shared header
│   │   ├── DataTable.tsx         # Reusable data table
│   │   ├── MetricStats.tsx       # Statistics widget
│   │   └── Footer.tsx            # Footer component
│   │
│   ├── layout/                   # Layout components
│   │   ├── DashboardLayout.tsx
│   │   └── DashboardHeader.tsx
│   │
│   ├── ui/                       # Base UI components (Design System)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Label.tsx
│   │   ├── Accordion.tsx
│   │   ├── Pagination.tsx
│   │   ├── ActionLink.tsx
│   │   └── common/              # Additional UI utilities
│   │       ├── StatusBadge.tsx
│   │       ├── StatCard.tsx
│   │       ├── DeliveryStatusCard.tsx
│   │       └── DeliveryDetail.tsx
│   │
│   └── modals/                   # Modal components
│       ├── DashboardModals.tsx
│       ├── LogoutModal.tsx
│       └── TaskModals.tsx
│
├── context/                       # React Context for state management


│
├── lib/                           # Utility functions & helpers
│   └── utils.ts                   # Helper functions
│
├── public/                        # Static assets
│   ├── avatar/                    # User avatars
│   ├── dashboard/                 # Dashboard images
│   │   └── provider/
│   │       └── opportunity/       # Opportunity-related images
│   └── landing/                   # Landing page assets
│
├── Configuration Files:
│   ├── next.config.ts             # Next.js configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── postcss.config.mjs          # PostCSS configuration (Tailwind)
│   ├── eslint.config.mjs           # ESLint rules
│   ├── package.json               # Dependencies & scripts
│   └── next-env.d.ts              # Next.js auto-generated types
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd next-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```bash
   NEXT_PUBLIC_API_URL=<your-api-url>
   # Add other environment variables as needed
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📜 Available Scripts

| Script          | Description                                               |
| --------------- | --------------------------------------------------------- |
| `npm run dev`   | Start development server with hot reload (localhost:3000) |
| `npm run build` | Create optimized production build                         |
| `npm start`     | Start production server                                   |
| `npm run lint`  | Run ESLint to check code quality                          |

### Example Usage

**Development:**

```bash
npm run dev
```

**Production Build:**

```bash
npm run build
npm start
```

**Code Quality:**

```bash
npm run lint
```

---

## 🏗️ Architecture & Design

### Design System

The project implements a comprehensive design system approach:

- **Base UI Components** (`/components/ui/`) - Atomic, reusable components built with Radix UI and Tailwind CSS
- **Composed Components** (`/dashboard/`, `/landing/`, `/auth/`) - Feature-specific components composed from base UI components
- **Page Components** (`/app/`) - Route-level components using Next.js App Router

### State Management

- **React Context API** - Centralized state for authentication and user roles
  
  

### Styling Strategy

- **Tailwind CSS 4** - Utility-first CSS framework for responsive design
- **Dynamic Classes** - Using `clsx` and `tailwind-merge` for conditional styling
- **CSS Customization** - Custom theme in `globals.css`

### Performance Optimizations

- **Next.js App Router** - Improved routing with better code splitting
- **Image Optimization** - Automatic image optimization via Next.js
- **Font Optimization** - Using `next/font` with Google Fonts (Sora)
- **Code Splitting** - Automatic route-based code splitting

---

## ✨ Feature Overview

### Public Features

- **Landing Page** - Hero section, features showcase, pricing, FAQ, testimonials
- **Authentication** - Secure login, registration, password reset, email verification
- **Website Ownership Verification** - Multi-step verification process

### Provider Features

- **Opportunity Management** - View and manage available backlink opportunities
- **Task Delivery** - Submit and track backlink deliverables
- **Messaging** - Direct communication with requesters
- **Website Management** - Register and manage websites offering backlinks
- **Wallet/Earnings** - Track income and manage payments
- **Subscription Plans** - Choose pricing tier based on needs

### Requester Features

- **Task Creation** - Create backlink requests with specifications
- **Provider Discovery** - Search and filter available providers
- **Task Management** - Track request status and progress
- **Messaging** - Communicate with providers about tasks
- **Credit System** - Manage credits for task creation
- **Subscription Management** - Upgrade/downgrade plan

### Universal Features

- **Settings Dashboard** - Account, security, notifications, preferences
- **Referral System** - Share and earn through referrals
- **Notifications** - Real-time alerts via notification system
- **Analytics** - Performance metrics and statistics

---

## 👨‍💻 Development Guidelines

### Code Style & Quality

- **TypeScript** - Strict mode enabled for type safety
- **ESLint** - Enforces code quality standards
- **CSS Modules & Tailwind** - Scoped and utility-first styling

### Component Development Best Practices

1. **Use Type-Safe Components**

   ```tsx
   interface ComponentProps {
     title: string;
     onAction: () => void;
   }

   export default function Component({ title, onAction }: ComponentProps) {
     return <button onClick={onAction}>{title}</button>;
   }
   ```

2. **Leverage Base UI Components**
   - Use components from `/components/ui/` as building blocks
   - Combine for larger feature components

3. **Directory Naming Convention**
   - Page components: PascalCase
   - Utilities: camelCase
   - Directories: kebab-case

4. **Route Structure**
   - Use route groups `(groupName)` for layout organization
   - Protected routes under `(dashboard)`
   - Public routes under `(landingPage)`

---

## 🚀 Deployment

### Deploy on Vercel (Recommended)

1. **Push to Git Repository**

   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables

3. **Deploy**
   - Vercel automatically deploys on push to main branch

### Environment Variables for Production

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.backlyst.com

# Other production variables as needed
```

### Build Optimization

```bash
npm run build
# Outputs optimized production build to .next directory
npm start
# Serves production build on localhost:3000
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated:** February 2026
