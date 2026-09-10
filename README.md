# EVITRON 2K26 — Official Symposium & Registration Platform

**National Level Technical Symposium**  
*Department of Electronics and Communication Engineering*  
*Mahendra Engineering College (Autonomous)*  
*Associations: VELOCITY & IEEE*  
*Date: 08/10/2026 (Thursday)*  
*Motto: Create. Innovate. Elevate.*

---

## 1. System Architecture Overview

This platform uses a decoupled, cost-effective serverless architecture designed to run on **Vercel Hobby** without requiring Vercel Pro for Razorpay backend processing:

```
┌─────────────────────────────────┐
│     Frontend: Vercel Hobby      │
│  React + TypeScript + Tailwind  │
└───────────────┬─────────────────┘
                │
         HTTPS API calls
         (VITE_API_BASE_URL)
                │
                ▼
┌─────────────────────────────────┐       ┌────────────────────────────────┐
│   Backend: Cloudflare Worker    │ ────> │       Razorpay Orders API      │
│    (or Unified Express App)     │ <──── │      & Webhook Verification    │
└───────────────┬─────────────────┘       └────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Database: Supabase PostgreSQL  │
│     Registrations & Settings    │
└─────────────────────────────────┘
```

### Why this bypasses Vercel Pro limits:
1. **Frontend on Vercel Hobby:** Serves static HTML/JS/CSS worldwide with ultra-fast CDN edge delivery for zero cost.
2. **Backend on Cloudflare Workers:** Handles secret `RAZORPAY_KEY_SECRET`, HMAC signature verification, order creation, and webhooks completely on Cloudflare's free tier.
3. **No secret leakage:** Client code only sees public `VITE_API_BASE_URL` and `VITE_RAZORPAY_KEY_ID`.

---

## 2. Environment Variables & Secrets

### Public Variables (Frontend / Vercel):
Configure in Vercel Project Settings > Environment Variables:
```env
# Optional: defaults to same-origin /api if running in unified full-stack mode
VITE_API_BASE_URL=https://evitron26-backend.<your-worker-subdomain>.workers.dev
```

### Private Server Secrets (Cloudflare Worker / Server):
Configure via `wrangler secret put <KEY>`:
```env
# Razorpay Credentials (from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_signing_secret

# Supabase Credentials (from https://supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin Authentication
ADMIN_PASSWORD=Evitron26@mec.ece#07

# Email Notification API (Optional: Resend or SMTP)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

---

## 3. Local Development & Unified Run

The application includes a built-in Express server (`server.ts`) that runs Vite in middleware mode during local development, so you can test frontend and backend simultaneously on port 3000:

```bash
# Install dependencies
npm install

# Start local full-stack development server
npm run dev

# Open in browser
http://localhost:3000
```

---

## 4. Production Deployment Guide

### A. Deploy Database (Supabase)
1. Create a free project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `/backend/schema.sql` and click **Run**.
4. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Settings > API.

### B. Deploy Backend to Cloudflare Workers
1. Navigate to `/backend/worker`:
   ```bash
   cd backend/worker
   ```
2. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```
3. Set your secrets:
   ```bash
   npx wrangler secret put RAZORPAY_KEY_ID
   npx wrangler secret put RAZORPAY_KEY_SECRET
   npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
   ```
4. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```
5. Note your deployed worker URL (e.g. `https://evitron26-backend.workers.dev`).

### C. Deploy Frontend to Vercel (Hobby Tier)
1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the Environment Variable:
   - `VITE_API_BASE_URL` = your Cloudflare Worker URL
4. Click **Deploy**.

---

## 5. Critical Registration & Validation Rules

- **RULE 1 (Workshops):**
  - Registration is strictly **individual** (1 participant = ₹350).
  - A workshop participant can register for **one workshop only** and is blocked from technical or non-technical events due to schedule conflicts.
- **RULE 2 (Technical Events):**
  - Registration requires **exactly 3 members** per team (1 Team Leader + 2 Members).
  - Transaction fee = **₹1050** for the team. Team leader pays.
- **RULE 3 (Non-Technical Events):**
  - Cannot be registered alone.
  - Allowed only in conjunction with at least one technical event.
- **Emergency UPI Fallback:**
  - Dynamic QR code displayed directly on mobile.
  - Participants can pay and submit their 12-digit UTR reference.
  - Admin can update UPI ID, QR code image, and Google Drive upload URL anytime from `/admin`.

---

## 6. Admin Portal (`/admin`)

- **Default Initial Organizer Credential:** `Evitron26@mec.ece#07` (stored hashed server-side).
- Features:
  - **Live Registration Counter & Analytics:** Workshop vs Technical vs Non-technical breakdowns.
  - **Registration Open/Closed Toggle:** Instantly halts registrations across both frontend and backend.
  - **UPI & Payment Controls:** Live edit UPI ID, QR Code image, and Google Drive proof link.
  - **Event Coordinator CMS:** Edit coordinator names, phone numbers, and rules in real-time.
  - **Attendance Scanner & Check-in:** Real-time QR ID verification for event day.
  - **Export to CSV:** Export full participant rosters with contact info.
