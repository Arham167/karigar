-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('buyer', 'seller')),
  name VARCHAR(100),
  cnic VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Providers (sellers) table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  business_name VARCHAR(150),
  location VARCHAR(255),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  base_rating DECIMAL(3, 2) DEFAULT 5.0,
  on_time_score DECIMAL(3, 2) DEFAULT 5.0,
  cancellation_rate DECIMAL(3, 2) DEFAULT 0.0,
  profile_image_url TEXT,
  specialization VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider services (what they offer + rates)
CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  service_type VARCHAR(100),
  base_rate DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider reviews
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  buyer_id UUID REFERENCES users(id),
  rating DECIMAL(3, 2),
  text_review TEXT,
  service_type VARCHAR(100),
  verified_by_antigravity BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  service_type VARCHAR(100),
  location VARCHAR(255),
  requested_time TIMESTAMP,
  confirmed_time TIMESTAMP,
  price DECIMAL(10, 2),
  status VARCHAR(50) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'disputed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Booking slots (provider's calendar)
CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('booked', 'available')),
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  sender_id UUID REFERENCES users(id),
  message TEXT,
  extracted_price DECIMAL(10, 2),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  filer_id UUID REFERENCES users(id),
  dispute_type VARCHAR(50) CHECK (dispute_type IN ('no-show', 'quality', 'price', 'cancellation', 'other')),
  description TEXT,
  antigravity_evaluation TEXT,
  resolution VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider cancellations
CREATE TABLE provider_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  booking_id UUID REFERENCES bookings(id),
  cancelled_at TIMESTAMP DEFAULT NOW()
);

-- ── MIGRATION ADITIONS: SECURE NEGO-CHAT AGREEMENT LOCKS ──
-- Run this in your Supabase SQL Editor to support the agreement lock flow:
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS buyer_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seller_agreed BOOLEAN DEFAULT FALSE;
