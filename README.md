# Pharma Connect Pro

Objective: Build a premium, frontend-only prototype for a Pharmaceutical CRM & Sales Management System. This is strictly a Client Presentation Prototype. The goal is to impress the stakeholders within the first 30 seconds by delivering a highly polished, interactive, and visually stunning experience that feels 100% production-ready.

Strict Constraints:

Do NOT build backend services, APIs, databases, authentication logic, CRUD persistence, or business logic.

Do NOT include form validation that blocks navigation (UI error states are fine for demonstration).

ALL data must be realistic, hardcoded mock data.

🎨 Design Language & Aesthetic

The UI must feel like a tier-one enterprise SaaS product.

Inspirations: Linear, Vercel, Stripe Dashboard, Notion, Raycast, Apple Human Interface Guidelines.

Vibe: Trustworthy, professional, simple, modern, and aligned with strict pharmaceutical standards. Avoid overly flashy or gamified elements.

Color Palette:

Primary: Deep Blue

Secondary: Emerald Green

Neutrals: Crisp White, Light Gray, Slate, Soft Black.

Typography: Sans-serif, modern, large bold headings, comfortable line height, readable data tables, minimal labeling with muted helper text.

Spacing: High whitespace, breathable layouts.

🪟 Glassmorphism & UI Polish (Premium Details)

Use subtle glassmorphism to elevate the UI without sacrificing readability.

Apply to: Login card, top navbar, notification panels, profile dropdowns, floating widgets, modals, and a translucent sidebar.

Glass Guidelines: Background opacity 8–15%, backdrop blur 12–20px, thin white border (10–15% opacity), soft layered shadows, rounded corners (14–18px).

UI Polish: Soft shadows, blurred backgrounds, card hover lifts, floating action buttons, and beautiful empty/error states.

🚀 Core Views & Modules

1. Cinematic Landing / Login Page

Background: Full-screen automatic slideshow (5–7s intervals) of high-quality pharmaceutical imagery (labs, manufacturing, capsules, warehouses).

Transitions: Smooth crossfades, soft dark overlay, and a slow Ken Burns (zoom) effect.

Animated Haze: A continuous, slowly moving white mist/fog effect at the bottom of the screen using floating particles and blur for elegant depth.

Login Card (Center): Glassmorphic card containing a logo placeholder, welcome text, email/password inputs, and a "Login" button.

Demo Accounts Section: Quick-login cards for Administrator, Sales, QA, and Regulatory. Clicking a card auto-fills the inputs; clicking Login instantly routes to the Dashboard.

2. Global App Layout

Structure: Collapsible Sidebar (Lucide icons, smooth width transition), Top Navigation (Search, Theme Toggle, Notification Bell, Profile Avatar), and Main Content Area.

Sidebar Modules: Dashboard, Client Master, Product Master, Customer Inquiry, Final Order, Reports, Settings, Profile, Logout.

3. Executive Dashboard

Top: Welcome banner.

Quick Stats: Total Clients, Products, RFQs, Active Orders, Revenue, Pending Tasks.

Widgets: Monthly Sales Chart, Revenue Chart, Top Customers, Recent Orders, Calendar Widget, Upcoming Follow-ups, Country Distribution Map/Chart.

4. Client Master (CRM)

List View: Search, filters, and premium company cards.

Detail View: Slide-out drawer showing company info, contact persons, address details, uploaded documents preview, payment terms, bank details, and an interactive timeline.

5. Product Master (Catalogue)

List View: Modern data table with sticky headers, search, and filters (Category, Dosage Form, Generic Name, Strength, Packaging).

Detail View: Slide-out drawer with product specs and beautiful empty states if data is missing.

6. Customer Inquiry (Wizard)

Multi-step Stepper: General Info -> Product Details -> Commercial Info -> Attachments -> Review -> Submit.

Interaction: Smooth slide transitions between steps.

7. Final Order

Summary View: Elegant page showing Customer, Products, Shipping Details, Commercial Summary, Payment Info, and Attachments.

Tracker: Visual progress tracker/timeline for order status.

8. Reports & Analytics

Charts: Revenue, Sales, Top Clients, Country Distribution, Inquiry Status, Product Performance.

UI Controls: Interactive (but static) filters and "Export" buttons that trigger toast notifications.

🧱 Components & Tables

Reusable UI Kit: Buttons, Cards, Inputs, Dropdowns, Search bars, Badges, Timelines, Modals, Drawers, Tabs, Accordions, File Upload Cards, Skeleton Loaders, Toast Notifications, and Breadcrumbs.

Enterprise Tables: Must include Search, Sorting, Pagination (UI only), Sticky Headers, Status Chips, Action Menus, and Hover effects.

✨ Animation & Responsiveness

Framer Motion: Use extensively but tastefully.

Required Animations: Page transitions, fade-ins, scroll reveals, card hover lifts, button ripples, animated counters for stats, micro-interactions, modal/drawer slides, chart rendering animations, and skeleton loading pulses.

Responsive: Fully adaptive across Desktop, Tablet, and Mobile. Include a bottom navigation bar for mobile views.

Theming: Full Light & Dark mode support with local storage persistence.

💻 Tech Stack & Execution Instructions

Framework: Next.js (App Router), React, TypeScript.

Styling: Tailwind CSS, clsx, tailwind-merge.

UI/Icons: Shadcn/UI (simulated/custom built), Lucide React.

Animations: Framer Motion.

Data Vis & Tables: Recharts, TanStack Table.

Forms & Uploads: React Hook Form (UI only), React Dropzone.

Mock Data Requirements:

Create centralized, highly detailed JSON arrays for pharmaceutical companies (e.g., "Novartis Bio", "Apex Pharma"), medicines (e.g., "Amoxicillin 500mg Capsule"), currencies, and RFQs.

Ensure data consistency (e.g., the same client name appears in the Dashboard and Client Master).

Output Generation Rules:

Begin by outlining the exact project file structure.

Provide the configuration files (tailwind.config.ts, globals.css with theme variables).

Provide the mock data files.

Generate the layouts, components, and page views step-by-step, ensuring all styling matches the premium enterprise aesthetic requested.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://medikit-spark.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fd14e46-48d0-40ac-a3ea-184cce8160fe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
