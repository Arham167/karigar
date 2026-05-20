# Karigar

**Karigar** is a mobile-first service marketplace built for the Google AI Seekho Hackathon using Antigravity. The app connects buyers with local service providers in Karachi, enabling fast service discovery, bookings, and live chat negotiations.

## 🚀 Project Overview

Karigar is designed as a dual-mode marketplace where:
- **Buyers** can request services using natural language and location-aware discovery.
- **Sellers/Karigars** can manage bookings, receive incoming customer requests, and negotiate service terms.

The prototype demonstrates a working end-to-end flow from authentication to location-based matching and chat-based booking confirmation.

---

## 🧩 Tech Stack

### Frontend
- **React Native** with **Expo**
- **React Navigation** for screen flow
- **Supabase** for authentication, user/session management, and database access
- **Expo Location** for GPS and location permissions
- **React Native Maps** for service provider map visualization
- **Expo Notifications** for local push notifications and booking reminders
- **Zustand** for lightweight local state management
- **Lucide React Native** for UI icons
- **React Native Paper** for UI components

### Backend
- **Node.js** + **Express**
- **Supabase** SDK for database queries
- **Gemini** fallback for NLP intent extraction when local heuristics do not match
- **Axios** for HTTP requests
- **dotenv** for local configuration
- **CORS** support for frontend/backend communication

### Data & Services
- **Supabase** for Postgres-backed user profiles, providers, bookings, chats, and booking state
- **Google Maps / location services** integration on the frontend for map display and geolocation
- **Custom NLP parser** with support for English, Urdu, and Roman Urdu service requests

---

## 📁 Repository Structure

- `frontend/` - Expo mobile app code
  - `App.js` - main app entry and navigation stack
  - `screens/` - buyer and seller screens, chat, map, authentication flow
  - `utils/` - Supabase client, notification manager
  - `store/` - auth store
- `backend/` - Express API server and controllers
  - `routes/` - API route definitions
  - `controllers/` - business logic for matches, chat, intent parsing, bookings
  - `utils/` - Supabase helper, NLP parser, Google services helpers
- `supabase_schema.sql` - schema reference for database structure

---

## ✅ Key Features

### Buyer experience
- Phone-based OTP login / signup flow
- Role selection for buyer or seller
- Natural language service request handling
- Location-aware provider matching shown on a modern interactive map
- Live provider profile preview and quote negotiation
- Local notifications for booking confirmations and reminders

### Seller experience
- Seller dashboard with bookings and negotiation summary
- Incoming booking and chat notification support
- Job status tracking with current, upcoming, and completed jobs
- Profile management and provider specialization handling

### Matching & AI
- Text intent extraction using a custom NLP parser
- Support for English, Urdu, and Roman Urdu service request parsing
- Provider matching using service type, location, and time criteria
- Geographic matching tuned for Karachi neighborhoods and coordinates

### Real-time & UX
- In-app chat remarks and negotiation flow
- Live updates for chat and booking status via Supabase
- Smooth mobile-first UI with map animations and custom theming
- Push notifications and reminder channel setup for bookings

---

## 🛠️ Setup

### Prerequisites
- Node.js (recommended latest LTS)
- npm or yarn
- Expo CLI installed globally (`npm install -g expo-cli`)
- Supabase project with authentication and tables configured

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` or `.env.local` with values such as:
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   SHARED_GOOGLE_SHEET_ID=your-google-sheet-id
   GCP_SERVICE_ACCOUNT_KEY="...json contents..."
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` with Supabase values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Launch the app:
   ```bash
   npm start
   ```

### Run on device/emulator
- Expo will open a local dev dashboard
- Use `expo run:android`, `expo run:ios`, or the Expo Go app to run

### Deployment
- Backend is deployed to **Vercel**
- Frontend is published as an **APK in the latest GitHub release**

---

## 🧠 Architecture

Karigar employs a robust client-server architecture tailored for mobile devices. 
- **Frontend:** React Native with Expo, utilizing Zustand for local state management and React Navigation for routing. `App.js` configures the navigation stack and `utils/notificationManager.js` handles local notifications.
- **Backend:** Node.js and Express RESTful API. Controllers handle NLP intent extraction, location-based provider matching, and secure booking orchestration. 
- **Database:** Supabase (PostgreSQL) manages users, providers, real-time chat sync, and booking states.
- **AI Layer:** Antigravity orchestration via Gemini handles complex intent parsing for multi-lingual service requests (English, Urdu, Roman Urdu).

---

## 🗄️ Provider Dataset Schema

Our database tracks providers with the following key attributes (via Supabase PostgreSQL):
- `id`: UUID (Primary Key)
- `user_id`: Reference to base user account
- `business_name`, `specialization`: Service metadata
- `location`, `lat`, `lng`: Geographic coordinates for distance matching
- `base_rating`, `on_time_score`, `cancellation_rate`: Quality metrics used in matching
- `profile_image_url`: Visual identity
- **Related tables:** `provider_services` (rates/services), `booking_slots` (availability), and `provider_reviews` (feedback).

---

## ⚖️ Matching Factors

When a buyer requests a service, the backend matches them with providers based on:
1. **Service Intent Matching:** NLP extraction maps the buyer's query to a specific service type (e.g., "AC repair", "Plumber").
2. **Geospatial Proximity:** Distance between the buyer's location and the provider's registered `lat`/`lng`.
3. **Availability:** Checking `booking_slots` to ensure the provider is free at the requested time.
4. **Provider Quality:** Incorporating `base_rating`, `on_time_score`, and inverse `cancellation_rate` to surface reliable Karigars first.

---

## 🤖 Antigravity Workflow

Antigravity serves as the core orchestration and intelligence layer:
1. **Request Intake:** Buyer submits a natural language request.
2. **Intent Parsing:** Custom heuristics attempt to parse the request. If confidence is low, the query is routed to the **Gemini AI fallback** to extract service type, urgency, and specific needs.
3. **Smart Matching:** AI assesses matching factors (location, rating, availability) and returns the top optimal providers.
4. **Negotiation Orchestration:** During live chat, Antigravity monitors the chat for price agreements and explicitly updates booking states when both parties agree on a quote.

---

## 🔌 APIs & Tools Used

- **React Native & Expo:** Mobile frontend framework.
- **Node.js & Express:** Backend API server.
- **Supabase:** Real-time PostgreSQL database & Authentication.
- **Google Maps API:** Geocoding and map visualizations.
- **Gemini AI API:** Advanced NLP intent extraction and fallback processing.
- **Zustand:** Lightweight frontend state management.

---

## 📝 Assumptions

- Users have access to smartphones with active internet and location services.
- Providers keep their availability schedules moderately up to date.
- The default operational zone is within the Karachi metropolitan area.
- Most service negotiations can be resolved via in-app text chat.

---

## ⚡ Cost & Latency Analysis

- **Latency:** 
  - Standard REST API calls (Node.js) & direct Supabase queries: ~100-200ms.
  - Gemini AI NLP fallback: ~800ms-1.5s (only triggered when local heuristics fail, minimizing average response time).
  - Real-time chat (Supabase websockets): <50ms.
- **Cost Efficiency:**
  - Supabase free tier supports the prototype's database and auth needs.
  - Vercel serverless backend scales automatically at zero base cost.
  - Gemini API usage is optimized by relying on local regex/heuristic matching first, reducing LLM token costs by ~70% for standard queries.

---

## 📊 Baseline Comparison

- **Traditional Search (e.g., Google/Facebook groups):** Requires manual searching, calling, and availability checking. *Karigar reduces discovery time from hours to seconds.*
- **Standard Directories:** Static listings without real-time availability or integrated negotiation. *Karigar offers live booking slots and in-app quote agreement.*
- **Karigar w/o AI:** Strict keyword matching fails on Roman Urdu or slang. *Karigar with Antigravity AI correctly routes colloquial requests (e.g., "mera AC pani phenk raha hai") to the right technicians.*

---

## 🔒 Privacy Note

- Location data is requested only when a buyer initiates a service search or a provider registers their service zone.
- Real-time coordinates are not broadcast continuously; static locations are used for matching.
- Chats are securely stored in Supabase and only accessible by the involved buyer and seller.
- User PII (phone numbers, CNIC) is stored securely and not exposed in public provider profiles.

---

## ⚠️ Limitations

- **Cold Start Problem:** The app requires a baseline number of registered Karigars in a neighborhood to provide useful matches.
- **AI Latency Spike:** If local heuristics fail completely, the Gemini fallback adds a slight delay to the initial matching process.
- **Dispute Resolution:** Currently handled manually or via simple reporting; fully automated AI dispute resolution based on chat history is planned but not fully robust yet.
- **Authentication:** Phone numbers and OTPs are currently hardcoded in Supabase, as we did not have the time or funds to set up SMS OTP sending via providers like Twilio for this prototype.

---

## 💡 Future Ideas (Not Yet in Prototype)

### Community directory
- Allow users to add service provider entries after using a service
- Fields: business name, location, service type, phone number
- Sync additions into Google Maps or another public directory

### Availability-aware messaging
- If top-rated sellers are busy at the requested time, show a dedicated message:
  - "The highest-rated sellers are booked at this time. They will next be available at XX:XX. Book from there?"
- Offer alternative booking windows or waitlist options

### Seller request controls
- Give sellers explicit accept/reject options for buyer requests
- Add counter-offer flow similar to Careem/Uber bargaining
- Enable richer negotiation status and price adjustment inside chat

---

## 📌 Important Files

- `frontend/App.js`
- `frontend/screens/MapScreen.js`
- `frontend/screens/SellerDashboard.js`
- `frontend/screens/KarigarChat.js`
- `frontend/utils/notificationManager.js`
- `backend/server.js`
- `backend/controllers/matchingController.js`
- `backend/controllers/intentController.js`
- `backend/utils/nlpParser.js`
- `supabase_schema.sql`

---

## 📝 License

This project is currently a hackathon prototype and may be updated with a formal license later.
