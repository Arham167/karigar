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
- Update the release link when the newest APK is available

---

## 🧠 Architecture Notes

### Frontend
- Mobile screens are organized under `frontend/screens`
- `App.js` configures the navigation stack and loads notification initialization
- `frontend/utils/supabase.js` creates the Supabase client with persisted auth
- `frontend/utils/notificationManager.js` configures Android channels and schedules local notifications

### Backend
- `backend/server.js` loads environment variables and mounts API routes
- `backend/controllers/matchingController.js` handles provider matching, availability, and location logic
- `backend/controllers/intentController.js` exposes intent parsing for NLP requests
- `backend/utils/nlpParser.js` contains the NLP parser with local heuristics and Gemini fallback
- `backend/routes/antigravity.js` is reserved for Antigravity AI orchestration

---

## 📌 Notes for Hackathon Context

- Built for **Google AI Seekho Hackathon** with an emphasis on local service discovery and AI-assisted request handling.
- NLP extraction uses local defaults first, and if no strong local match is found the app falls back to **Gemini**.
- The NLP parser is tailored for English, Urdu, and Roman Urdu service requests.

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
