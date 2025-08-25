CNC Customer Portal + Admin Panel
This repository contains the full-stack Next.js application for a CNC customer portal and administrative panel, leveraging Supabase for database, authentication, storage, and real-time functionalities. The application is designed for production deployment on Vercel.

Table of Contents
Features

Technology Stack

Getting Started

Prerequisites

Local Development Setup

Supabase Setup

Environment Variables

Database Schema & Migrations

Authentication & RBAC

File Structure

Deployment to Vercel

Acceptance Criteria

Contributing

License

Features
Customer Portal:

Authentication: Email link (Magic Link) and Google OAuth.

Dashboard: Overview of recent quotes, messages, and parts.

CAD Upload: Drag-and-drop interface for .stl, .step, .stp, .iges, .igs files.

Abandoned Quote Capture: Anonymous upload flow with email capture modal and activity logging.

Instant Quote: Real-time pricing with detailed breakdown.

Parts Management: List and preview owned parts.

Quotes: View quotes with status timeline, real-time chat, attachments, and checkout options (Stripe/PayPal stubs).

Account Settings: Manage profile, company, addresses, and notification preferences.

Custom Forms: Dynamic rendering of custom forms defined by the admin.

Admin Panel:

Dashboard: Key Performance Indicators (KPIs) like quotes by status, 30-day revenue, conversion rate, abandoned funnel, recent messages, latest uploads, and workload.

Catalog Management: CRUD operations for Materials, Finishes, and Tolerances with is_active toggles.

Quotes Management: List and detail views, edit line items, change status, real-time chat, resend links, and export PDF stub.

User Management: CRUD for users with role enforcement.

Customer Management: CRUD for customers with detail history (quotes, activities, contacts).

Parts Gallery: Global gallery with filters and search.

Payments: List of payments with provider payload reference and quote links.

Abandoned Quotes: List of abandoned quotes with action to convert to customer.

Custom Forms Builder: JSON schema editor for building forms with preview and visibility toggles.

Core Functionality:

Role-Based Access Control (RBAC): admin, staff, customer roles.

Supabase Integration: Auth, Postgres Database, Storage (for CAD files), and Realtime (for chat/quotes).

Pricing Utility: Comprehensive lib/pricing.ts for instant quote calculations.

Robust APIs: For uploads, quotes, messages, and payments.

Security: Server actions for sensitive mutations, RLS, signed URLs, Zod validation.

Technology Stack
Framework: Next.js (App Router, TypeScript)

Hosting: Vercel

Database: Supabase (Postgres)

Authentication: Supabase Auth (Email Link, Google OAuth)

Storage: Supabase Storage (Parts, Attachments)

Realtime: Supabase Realtime (Messages, Quotes)

Styling: Tailwind CSS, shadcn/ui

UI Icons: Lucide React

Form Management: Zod, React Hook Form

Table Management: @tanstack/react-table

Date Utilities: date-fns

Unique IDs: uuid

Supabase SDKs: @supabase/supabase-js, @supabase/ssr

3D Viewer (Stub): @react-three/fiber, three

Getting Started
Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v18 or higher)

npm or yarn

Git

A Supabase project (free tier is sufficient for development)

A Vercel account (optional, for deployment)

Local Development Setup
Clone the repository:

git clone <repository-url>
cd cnc-customer-portal

Install dependencies:

npm install
# or
yarn install

Set up environment variables:
Create a .env.local file in the root of your project and populate it as described in the Environment Variables section.

Run the development server:

npm run dev
# or
yarn dev

Open http://localhost:3000 in your browser.

Supabase Setup
Create a new Supabase project:
Go to Supabase and create a new project.

Get your API keys:
Navigate to Project Settings > API to find your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
Go to Project Settings > General Settings > API Keys to get your SUPABASE_SERVICE_ROLE_KEY.

Run database migrations:
Execute the SQL from sql/schema.sql in your Supabase SQL Editor. This will create all necessary tables and extensions.

Enable Row Level Security (RLS):
Enable RLS on all tables as specified in the row_level_security section of the project plan.

Set up Storage Buckets:
Create parts and attachments storage buckets in Supabase, set to private. Implement RLS policies for these buckets to control access.

Configure Authentication:

Email Link: Enable Email authentication in Authentication > Settings.

Google OAuth: Configure Google OAuth in Authentication > Providers. You'll need to create a Google Cloud Project and obtain client ID/secret.

Seed Initial Data (Optional but recommended for development):
You can manually insert sample data for materials, finishes, tolerances, and rate_cards into your Supabase tables to facilitate development and testing.

Environment Variables
Create a .env.local file in the root of your project:

# Required Supabase Keys
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# Optional Payment Gateway Keys (for production)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYPAL_CLIENT_ID="YOUR_PAYPAL_CLIENT_ID"
PAYPAL_SECRET="YOUR_PAYPAL_SECRET"

Note: SUPABASE_SERVICE_ROLE_KEY should NEVER be exposed to the client-side. It's used only in server-side contexts (e.g., API routes, server actions).

Database Schema & Migrations
The database schema is defined in sql/schema.sql. It includes tables for profiles, customers, catalog items (materials, finishes, tolerances), rate cards, parts, quotes, quote items, messages, payments, activities, abandoned quotes, and custom forms/responses.

To apply the schema:

Go to your Supabase project dashboard.

Navigate to the SQL Editor.

Paste the contents of sql/schema.sql and run it.

Row Level Security (RLS): RLS is enabled for all tables, and specific policies are required to control data access based on user roles and ownership. Refer to the row_level_security section of the original project plan for detailed policy requirements.

Authentication & RBAC
The application uses Supabase Auth for user management.

Providers: Email Link (Magic Link) and Google OAuth.

On First Login Profile: A profile record is created for new users upon their first login.

Default Role: New users are assigned the customer role by default.

Roles: admin, staff, customer.

Auth Helpers: requireAuth() and requireAdmin() functions (to be implemented) for protecting routes.

Middleware: The middleware.ts file will protect the /admin prefix, denying access to users who do not have admin or staff roles.

File Structure
The project follows a Next.js App Router structure:

/app
  /(public)
    /login
      page.tsx
    /signup
      page.tsx
  /(customer)
    /dashboard
      page.tsx
    /upload
      page.tsx
    /parts
      page.tsx
    /quotes
      page.tsx
    /quote/[id]
      page.tsx
    /instant-quote
      page.tsx
    /account
      page.tsx
    /forms/[formId]
      page.tsx
  /admin
    /dashboard
      page.tsx
    /quotes
      page.tsx
    /quotes/[id]
      page.tsx
    /materials
      page.tsx
    /finishes
      page.tsx
    /tolerances
      page.tsx
    /forms
      page.tsx
    /forms/[id]
      page.tsx
    /users
      page.tsx
    /customers
      page.tsx
    /customers/[id]
      page.tsx
    /parts
      page.tsx
    /payments
      page.tsx
    /abandoned
      page.tsx
  /api
    /upload
      /part
        route.ts
    /quotes
      route.ts
    /messages
      route.ts
    /payments
      /checkout
        route.ts
      /stripe
        /webhook
          route.ts
/components
  /forms
    DynamicForm.tsx
  /upload
    PartDropzone.tsx
  /quotes
    QuoteTable.tsx
    QuoteChat.tsx
/lib
  /supabase
    client.ts
    server.ts
  auth.ts
  pricing.ts
  storage.ts
  /validators
    *.ts
/middleware.ts
/sql
  schema.sql
/README.md

Deployment to Vercel
Create a new Vercel project:
Go to Vercel and create a new project, linking it to your Git repository.

Configure Environment Variables:
In your Vercel project settings, go to Settings > Environment Variables and add all the required and optional environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, etc.) as defined in the Environment Variables section.

Deploy:
Vercel will automatically detect your Next.js project and deploy it. Subsequent pushes to your main branch will trigger automatic re-deployments.

Acceptance Criteria
Anonymous CAD upload triggers email capture and abandoned quote entry.

Active materials/finishes/tolerances only are visible to the customer.

Draft quotes persist with line items and pricing JSON.

Quote detail has real-time chat and status timeline.

Admin dashboard shows KPIs and feeds.

Admin can CRUD catalog and quotes, export PDF stub.

Users/customers/parts/payments/abandoned pages functional with RBAC.

Custom forms builder renders in customer portal and saves responses.

RLS prevents cross-tenant access; /admin is gated by role.

Builds on Vercel; environments are documented in README.

Contributing
Feel free to contribute to this project by submitting pull requests or opening issues.

License
This project is licensed under the MIT License.
