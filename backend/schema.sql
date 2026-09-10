-- =========================================================
-- EVITRON 2K26 - Database Schema (Supabase / PostgreSQL)
-- National Level Technical Symposium
-- Department of Electronics and Communication Engineering
-- Mahendra Engineering College
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
  symposium_title VARCHAR(255) NOT NULL DEFAULT 'EVITRON 2K26',
  sub_title VARCHAR(255) NOT NULL DEFAULT 'National Level Technical Symposium',
  department VARCHAR(255) NOT NULL DEFAULT 'Department of Electronics and Communication Engineering',
  college VARCHAR(255) NOT NULL DEFAULT 'Mahendra Engineering College',
  associations VARCHAR(255) NOT NULL DEFAULT 'VELOCITY & IEEE',
  event_date DATE NOT NULL DEFAULT '2026-10-08',
  countdown_target TIMESTAMPTZ NOT NULL DEFAULT '2026-10-08 09:00:00+05:30',
  registration_deadline DATE NOT NULL DEFAULT '2026-10-01',
  paper_submission_deadline DATE NOT NULL DEFAULT '2026-09-27',
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  closed_reason TEXT DEFAULT 'Registrations are currently closed.',
  upi_id VARCHAR(255) NOT NULL DEFAULT 'evitron26@mec',
  upi_payee_name VARCHAR(255) NOT NULL DEFAULT 'EVITRON 2K26 - MEC ECE',
  upi_qr_image_url TEXT DEFAULT '',
  drive_upload_url TEXT NOT NULL DEFAULT 'https://forms.gle/evitron26paymentproof',
  contact_email VARCHAR(255) NOT NULL DEFAULT 'evitron26@gmail.com',
  instagram_handle VARCHAR(255) NOT NULL DEFAULT 'velocityecemec',
  venue TEXT NOT NULL DEFAULT 'Mahendhirapuri, Mallasamudram (M), Namakkal (Dt), Tamil Nadu',
  announcement_text TEXT DEFAULT 'Paper abstract submission deadline is 27/09/2026. Welcome kits, lunch, and cash prizes for all events.',
  announcement_active BOOLEAN DEFAULT true,
  fee_per_person NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(100) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('workshops', 'technical', 'non-technical')),
  description TEXT NOT NULL,
  venue VARCHAR(255) NOT NULL,
  time_slot VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL DEFAULT '2026-10-08',
  eligibility TEXT NOT NULL,
  team_size INT NOT NULL DEFAULT 1,
  team_size_label VARCHAR(100) NOT NULL,
  fee_per_person NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  procedure JSONB NOT NULL DEFAULT '[]'::jsonb,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  certificates TEXT NOT NULL,
  important_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  coordinator_name VARCHAR(255) NOT NULL DEFAULT '[COORDINATOR NAME]',
  coordinator_phone VARCHAR(50) NOT NULL DEFAULT '[COORDINATOR PHONE]',
  coordinator_email VARCHAR(255) NOT NULL DEFAULT 'evitron26@gmail.com',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
  id VARCHAR(50) PRIMARY KEY, -- Format: EV26-XXXXXX
  registration_type VARCHAR(50) NOT NULL CHECK (registration_type IN ('workshop', 'technical')),
  selected_workshop_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
  selected_technical_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_non_technical_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('razorpay', 'upi')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' CHECK (payment_status IN ('paid', 'pending_verification', 'failed')),
  payment_id VARCHAR(255) UNIQUE,
  upi_reference VARCHAR(255),
  drive_screenshot_submitted BOOLEAN DEFAULT false,
  attendance_marked BOOLEAN DEFAULT false,
  attendance_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Participants Table (Linked to registration)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id VARCHAR(50) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  is_team_leader BOOLEAN NOT NULL DEFAULT false,
  participant_order INT NOT NULL DEFAULT 1, -- 1 = Leader, 2 = Member 2, 3 = Member 3
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  college VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  year_of_study VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Log (For event-day QR app)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id VARCHAR(50) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  scanned_by VARCHAR(100) DEFAULT 'organizer_scanner',
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Admin Authentication & Audit
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_payment_id ON registrations(payment_id);
CREATE INDEX IF NOT EXISTS idx_part_reg_id ON participants(registration_id);
CREATE INDEX IF NOT EXISTS idx_part_email ON participants(email);
