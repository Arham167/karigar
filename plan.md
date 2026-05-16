# AI SERVICE ORCHESTRATOR - FULL IMPLEMENTATION PLAN
## Frontend-First Approach

**Tech Stack**: React Native (frontend) + Node.js/Express (backend) + Supabase (DB) + Antigravity (orchestration)

**Timeline**: 5 phases, ~48-72 hours for a hackathon

**Approach**: Build UI first with mock data, then wire up APIs as you go

---

## **PHASE 0: SETUP & INFRASTRUCTURE** (4-6 hours)

### Objectives
- Set up all project scaffolding
- Create DB schema in Supabase
- Initialize Node.js backend skeleton
- Initialize React Native project
- Configure API keys (Google Maps, Antigravity)

### Deliverables

#### 0.1 Supabase Database Setup

Create the following tables in Supabase PostgreSQL:

```sql
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
```

#### 0.2 Node.js Backend Skeleton

Create project structure:

```
backend/
├── server.js                 # Express app entry point
├── package.json
├── .env                      # API keys, DB URL, etc.
├── config.js                 # Environment config
├── routes/
│   ├── auth.js              # Login/signup
│   ├── user.js              # Profile, role selection
│   ├── providers.js         # Provider search, details
│   ├── bookings.js          # Booking CRUD
│   ├── chat.js              # Chat messages
│   ├── feedback.js          # Reviews, ratings
│   ├── disputes.js          # Dispute handling
│   └── antigravity.js       # Antigravity orchestration
├── controllers/
│   ├── authController.js
│   ├── providerController.js
│   ├── bookingController.js
│   ├── intentController.js
│   ├── matchingController.js
│   ├── pricingController.js
│   └── disputeController.js
├── middleware/
│   ├── auth.js              # JWT verification
│   └── errorHandler.js
├── utils/
│   ├── googleMaps.js        # Google Maps API wrapper
│   ├── antigravity.js       # Antigravity API wrapper + caching
│   ├── helpers.js           # Utility functions
│   └── supabase.js          # Supabase client
└── services/
    └── googleSheetsService.js # Google Sheets CRM updates
```

**Install dependencies:**

```bash
npm init -y
npm install express cors dotenv @anthropic-ai/sdk @supabase/supabase-js axios
npm install --save-dev nodemon
```

**server.js template:**

```javascript
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes (will add these later)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/providers", require("./routes/providers"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/disputes", require("./routes/disputes"));

app.listen(3000, () => console.log("Server running on port 3000"));
```

**.env template:**

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_antigravity_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
JWT_SECRET=your_secret_key
NODE_ENV=development
```

#### 0.3 React Native Project Setup (Expo)

```bash
# Install Expo globally
npm install -g expo-cli

# Create new Expo project
npx create-expo-app kaamkaro
cd kaamkaro

# Install dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install expo-location expo-maps
npm install axios zustand
npm install @supabase/supabase-js
```

**Why Expo?** Makes it super easy to build APK without needing Android SDK locally installed.

**Project structure:**

```
frontend/
├── App.js                    # Navigation setup
├── screens/
│   ├── AuthScreen.js        # OTP login/signup
│   ├── RoleSelectionScreen.js
│   ├── ProfileSetupScreen.js
│   ├── MapScreen.js         # Map with provider popups
│   ├── ProviderDetailScreen.js
│   ├── ChatScreen.js
│   ├── BookingConfirmationScreen.js
│   ├── BookingsListScreen.js
│   ├── FeedbackScreen.js
│   ├── DisputeScreen.js
│   └── SellerDashboard.js
├── components/
│   ├── ProviderPopup.js
│   ├── PriceBreakdown.js
│   ├── TimeSlotSelector.js
│   ├── ChatBubble.js
│   ├── DisputeForm.js
│   └── ...
├── utils/
│   ├── api.js               # API calls (mock data for now)
│   └── storage.js           # Local storage (auth tokens, etc.)
├── store/
│   └── useStore.js          # Zustand store (global state)
└── styles/
    └── theme.js             # Colors, fonts, etc.
```

#### 0.2b Supabase Credentials Setup (Important!)

**Create Supabase Project:**
1. Go to https://supabase.com
2. Sign up with Google account
3. Click **"New Project"**
4. **Project name**: `kaamkaro`
5. **Database password**: Create a strong password (save it somewhere safe!)
6. **Region**: Select **Asia Southeast 1** (closest to Pakistan) or US-East if faster
7. Click **"Create new project"** and wait 2-3 minutes

**Get Your API Credentials:**
1. Once project is created, go to **Settings** (bottom left sidebar) → **API**
2. You'll see three things:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Long JWT string starting with `eyJ...`
   - **Service Role Key**: Another JWT (don't use this in frontend)

3. Copy and save:
   - Project URL
   - Anon Key

**Add to Your `.env` File:**

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Create Tables in Supabase:**
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy ALL the CREATE TABLE statements from **section 0.1 above** (the SQL code block)
4. Paste into the SQL editor
5. Click **"Run"**
6. All 9 tables should be created instantly

**Test Connection (from backend):**

Create a quick test file:

```javascript
// backend/test-supabase.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Error:", error.message);
  } else {
    console.log("✅ Supabase connected successfully!");
  }
}

test();
```

Run it:

```bash
cd backend
npm install @supabase/supabase-js dotenv
node test-supabase.js
```

Should print: `✅ Supabase connected successfully!`

If you get an error:
- Double-check your `.env` file has correct URL and Anon Key
- Make sure tables are created in SQL Editor
- Verify you copied the FULL Anon Key (should be ~100 characters)

#### 0.4 Google Maps API Setup

- Go to https://console.cloud.google.com
- Create a new project
- Enable: **Maps JavaScript API**, **Distance Matrix API**, **Places API**
- Create API key (Credentials → Create Credentials → API Key)
- Add to `.env` as `GOOGLE_MAPS_API_KEY`
- **Important**: Restrict to Android apps only (Security best practice)

#### 0.5 Antigravity API Setup

- Go to https://console.anthropic.com
- Get your API key from the API keys section
- Add to `.env` as `ANTHROPIC_API_KEY`
- Keep this secret! Don't commit to GitHub

### Checklist
- [ ] Supabase project created, all 9 tables created
- [ ] Node.js project initialized with dependencies
- [ ] .env file configured
- [ ] React Native project created
- [ ] Google Maps API key obtained
- [ ] Anthropic API key obtained
- [ ] Backend server runs without errors (`npm start`)
- [ ] Frontend project runs on simulator (`npm start`)

---

## **PHASE 1: AUTH & USER PROFILES** (3-4 hours)

### Objectives
- Build OTP login/signup UI
- Build role selection screen
- Build profile setup for buyers and sellers
- Connect to backend (mock for now, real API later)

### Deliverables

#### 1.1 Frontend: Auth Screens

**AuthScreen.js:**
- Phone number input field
- "Send OTP" button
- Once OTP sent, show OTP input field
- "Verify" button
- Success → navigate to RoleSelectionScreen

**Mock flow (no real API yet):**
```javascript
// screens/AuthScreen.js
import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";

export default function AuthScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    // TODO: Call API /api/auth/send-otp
    // For now, mock:
    console.log("OTP sent to", phone);
    setOtpSent(true);
  };

  const handleVerifyOTP = async () => {
    // TODO: Call API /api/auth/verify-otp
    // For now, mock:
    console.log("OTP verified:", otp);
    navigation.navigate("RoleSelection");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login/Signup</Text>
      <TextInput
        placeholder="Phone number (e.g., 03001234567)"
        value={phone}
        onChangeText={setPhone}
        editable={!otpSent}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />
      {!otpSent ? (
        <Button title="Send OTP" onPress={handleSendOTP} />
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />
          <Button title="Verify" onPress={handleVerifyOTP} />
        </>
      )}
    </View>
  );
}
```

#### 1.2 Frontend: Role Selection Screen

**RoleSelectionScreen.js:**
- Radio buttons: "Buyer" or "Seller"
- "Continue" button
- Navigate to ProfileSetupScreen with role

```javascript
// screens/RoleSelectionScreen.js
import React, { useState } from "react";
import { View, Button, Text } from "react-native";
import { RadioButton } from "react-native-paper"; // or custom

export default function RoleSelectionScreen({ navigation }) {
  const [role, setRole] = useState("buyer");

  const handleContinue = () => {
    // TODO: Call API /api/auth/select-role
    // For now, mock:
    navigation.navigate("ProfileSetup", { role });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Select Role</Text>
      <View style={{ marginBottom: 20 }}>
        <RadioButton
          value="buyer"
          status={role === "buyer" ? "checked" : "unchecked"}
          onPress={() => setRole("buyer")}
        />
        <Text>I'm a Buyer (looking for services)</Text>
      </View>
      <View style={{ marginBottom: 20 }}>
        <RadioButton
          value="seller"
          status={role === "seller" ? "checked" : "unchecked"}
          onPress={() => setRole("seller")}
        />
        <Text>I'm a Seller (providing services)</Text>
      </View>
      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
}
```

#### 1.3 Frontend: Profile Setup Screens

**ProfileSetupScreen.js (Buyer):**
- Name input
- CNIC input
- "Done" button → navigate to MapScreen

**ProfileSetupScreen.js (Seller):**
- Name input
- CNIC input
- Business name input
- Specialization dropdown (AC repair, plumbing, electrical, etc.)
- Profile image upload (mock for demo)
- Shop image upload (optional, mock for demo)
- "Done" button → navigate to SellerDashboard

```javascript
// screens/ProfileSetupScreen.js (simplified for buyer)
import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";

export default function ProfileSetupScreen({ navigation, route }) {
  const { role } = route.params;
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [specialization, setSpecialization] = useState("AC repair");

  const handleDone = async () => {
    // TODO: Call API /api/user/profile
    // For now, mock:
    const profileData = { role, name, cnic };
    if (role === "seller") {
      profileData.businessName = businessName;
      profileData.specialization = specialization;
    }
    console.log("Profile created:", profileData);
    navigation.navigate(role === "buyer" ? "Map" : "SellerDashboard");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Profile Setup</Text>
      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />
      <TextInput
        placeholder="CNIC"
        value={cnic}
        onChangeText={setCnic}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />
      {role === "seller" && (
        <>
          <TextInput
            placeholder="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />
          <Text>Specialization:</Text>
          {/* Dropdown for specialization */}
        </>
      )}
      <Button title="Done" onPress={handleDone} />
    </View>
  );
}
```

#### 1.4 Navigation Setup

**App.js:**
```javascript
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthScreen from "./screens/AuthScreen";
import RoleSelectionScreen from "./screens/RoleSelectionScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import MapScreen from "./screens/MapScreen";
import SellerDashboard from "./screens/SellerDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Checklist
- [ ] AuthScreen built (phone + OTP input)
- [ ] RoleSelectionScreen built (buyer/seller radio)
- [ ] ProfileSetupScreen built (buyer + seller variants)
- [ ] Navigation wired up (auth → role → profile → dashboard)
- [ ] Mock data flows work (no real API calls yet)
- [ ] UI is readable and functional

---

## **PHASE 2: INTENT INPUT & MAP UI** (5-6 hours)

### Objectives
- Build intent input screen (text field for service request)
- Build clarification popup (MCQ + text fallback)
- Build map screen with provider popups
- Build provider detail screen
- Wire with mock data

### Deliverables

#### 2.1 Frontend: Intent Input Screen

**MapScreen.js (buyer dashboard):**
- Large text input: "Mujhe kal subah G-13 mein AC technician chahiye"
- Google Map below
- "Find Services" button
- On submit: show mock clarification popup (if needed)

```javascript
// screens/MapScreen.js
import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function MapScreen({ navigation }) {
  const [request, setRequest] = useState("");
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationOptions, setClarificationOptions] = useState([]);
  const [providers, setProviders] = useState([]); // Mock providers on map
  const [selectedProvider, setSelectedProvider] = useState(null);

  const handleFindServices = async () => {
    // TODO: Call API /api/intent/parse
    // For now, mock:
    console.log("Parsing intent:", request);

    // Mock clarification (sometimes needed)
    const needsClarification = Math.random() > 0.7;
    if (needsClarification) {
      setClarificationOptions([
        "AC repair (fixing broken unit)",
        "AC service (maintenance/cleaning)",
        "AC installation (new unit)",
      ]);
      setShowClarification(true);
    } else {
      // Proceed to show mock providers
      loadMockProviders();
    }
  };

  const loadMockProviders = () => {
    // Mock provider data for map
    const mockProviders = [
      {
        id: 1,
        name: "Ali AC Expert",
        businessName: "Ali's AC Repair",
        rating: 4.8,
        lat: 24.8607,
        lng: 67.0011,
        image: "https://via.placeholder.com/100",
      },
      {
        id: 2,
        name: "Hassan Technician",
        businessName: "Hassan Services",
        rating: 4.5,
        lat: 24.862,
        lng: 67.0095,
        image: "https://via.placeholder.com/100",
      },
      {
        id: 3,
        name: "Fatima Expert",
        businessName: "Fatima AC Tech",
        rating: 4.9,
        lat: 24.859,
        lng: 67.0125,
        image: "https://via.placeholder.com/100",
      },
    ];
    setProviders(mockProviders);
  };

  const handleClarificationSelect = (option) => {
    // TODO: Call API /api/intent/clarify
    console.log("User clarified:", option);
    setShowClarification(false);
    loadMockProviders();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Intent Input */}
      <View style={{ padding: 15, backgroundColor: "#f5f5f5" }}>
        <Text style={{ fontSize: 14, marginBottom: 8 }}>
          What service do you need?
        </Text>
        <TextInput
          placeholder="E.g., Mujhe kal subah G-13 mein AC technician chahiye"
          value={request}
          onChangeText={setRequest}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 10,
            marginBottom: 10,
          }}
        />
        <Button title="Find Services" onPress={handleFindServices} />
      </View>

      {/* Map */}
      {providers.length > 0 && (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 24.8607,
            longitude: 67.0011,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {providers.map((provider) => (
            <Marker
              key={provider.id}
              coordinate={{ latitude: provider.lat, longitude: provider.lng }}
              onPress={() => {
                setSelectedProvider(provider);
                navigation.navigate("ProviderDetail", { provider });
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  padding: 8,
                  borderRadius: 4,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                  {provider.name}
                </Text>
                <Text style={{ fontSize: 10 }}>★ {provider.rating}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Clarification Modal */}
      <Modal
        visible={showClarification}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClarification(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}>
              Did you mean?
            </Text>
            {clarificationOptions.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleClarificationSelect(option)}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                }}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              placeholder="Or type your own clarification..."
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 15,
                borderRadius: 5,
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

#### 2.2 Frontend: Provider Detail Screen

**ProviderDetailScreen.js:**
- Provider image, name, business name
- Rating + on-time score + specialization tags
- Dynamic price quote (mock)
- Available time slots (mock)
- "Chat" and "View Full Profile" buttons

```javascript
// screens/ProviderDetailScreen.js
import React, { useState } from "react";
import {
  View,
  Image,
  Text,
  ScrollView,
  Button,
  TouchableOpacity,
} from "react-native";

export default function ProviderDetailScreen({ navigation, route }) {
  const { provider } = route.params;
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  // Mock data
  const mockQuote = {
    baseRate: 500,
    distanceCost: 50,
    urgencyMultiplier: 1.2,
    finalPrice: 660,
  };

  const mockSlots = [
    "10:00 AM (20 min travel)",
    "11:30 AM (20 min travel)",
    "2:00 PM (20 min travel)",
  ];

  return (
    <ScrollView style={{ padding: 15 }}>
      <Image
        source={{ uri: provider.image }}
        style={{ width: "100%", height: 200, borderRadius: 10, marginBottom: 15 }}
      />

      <Text style={{ fontSize: 20, fontWeight: "bold" }}>{provider.name}</Text>
      <Text style={{ fontSize: 14, color: "#666" }}>
        {provider.businessName}
      </Text>

      {/* Rating + Specialization */}
      <View style={{ marginVertical: 15 }}>
        <Text style={{ fontSize: 14 }}>⭐ {provider.rating} rating</Text>
        <Text style={{ fontSize: 12, color: "#666" }}>
          On-time score: 4.8 | AC Repair Specialist
        </Text>
      </View>

      {/* Price Quote */}
      <View
        style={{
          backgroundColor: "#f9f9f9",
          padding: 12,
          borderRadius: 8,
          marginBottom: 15,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "bold" }}>
          Estimated Price: PKR {mockQuote.finalPrice}
        </Text>
        <TouchableOpacity onPress={() => setShowPriceBreakdown(!showPriceBreakdown)}>
          <Text style={{ fontSize: 12, color: "#0066cc" }}>
            {showPriceBreakdown ? "Hide breakdown" : "Show breakdown"}
          </Text>
        </TouchableOpacity>
        {showPriceBreakdown && (
          <View style={{ marginTop: 10, fontSize: 12 }}>
            <Text>Base rate: PKR {mockQuote.baseRate}</Text>
            <Text>Distance cost: PKR {mockQuote.distanceCost}</Text>
            <Text>
              Urgency multiplier: {mockQuote.urgencyMultiplier}x
            </Text>
            <Text style={{ fontWeight: "bold", marginTop: 5 }}>
              Total: PKR {mockQuote.finalPrice}
            </Text>
          </View>
        )}
      </View>

      {/* Available Slots */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>
          Available Times
        </Text>
        {mockSlots.map((slot, idx) => (
          <TouchableOpacity
            key={idx}
            style={{
              padding: 10,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 5,
              marginBottom: 8,
            }}
          >
            <Text>{slot}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={{ gap: 10 }}>
        <Button
          title="Chat with Provider"
          onPress={() => navigation.navigate("Chat", { provider })}
        />
        <Button title="View Full Profile" color="#666" />
      </View>

      {/* Reviews */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>
          Recent Reviews
        </Text>
        <View style={{ backgroundColor: "#f5f5f5", padding: 10, borderRadius: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold" }}>
            Ahmed - ⭐⭐⭐⭐⭐
          </Text>
          <Text style={{ fontSize: 12 }}>
            Very professional and on-time. Highly recommend!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
```

#### 2.3 Frontend: Chat Screen (Mock)

**ChatScreen.js:**
- Chat bubbles (buyer on right, provider on left)
- Input field at bottom
- Mock messages about price negotiation
- "I agree to book at PKR XXX" button (both sides)
- Once both agree, "Confirm Booking" button appears

```javascript
// screens/ChatScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
} from "react-native";

export default function ChatScreen({ navigation, route }) {
  const { provider } = route.params;
  const [messages, setMessages] = useState([
    { id: 1, sender: "provider", text: "Hello! How can I help?" },
    { id: 2, sender: "buyer", text: "Hi, I need AC repair for tomorrow morning" },
    {
      id: 3,
      sender: "provider",
      text: "Sure! The quoted price is PKR 660. Does that work?",
    },
    { id: 4, sender: "buyer", text: "Can you do PKR 600?" },
    { id: 5, sender: "provider", text: "Yes, PKR 600 is fine. I agree to book at PKR 600" },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [buyerAgreed, setBuyerAgreed] = useState(false);
  const [providerAgreed, setProviderAgreed] = useState(true); // Mock: already agreed

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, sender: "buyer", text: newMessage },
      ]);
      setNewMessage("");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Chat bubbles */}
      <ScrollView
        style={{ flex: 1, padding: 15 }}
        contentContainerStyle={{ justifyContent: "flex-end" }}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={{
              marginBottom: 10,
              alignItems: msg.sender === "buyer" ? "flex-end" : "flex-start",
            }}
          >
            <View
              style={{
                backgroundColor:
                  msg.sender === "buyer" ? "#0066cc" : "#e8e8e8",
                padding: 10,
                borderRadius: 10,
                maxWidth: "80%",
              }}
            >
              <Text
                style={{
                  color: msg.sender === "buyer" ? "white" : "black",
                }}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Agreement buttons */}
      <View style={{ padding: 10, backgroundColor: "#f5f5f5" }}>
        {!buyerAgreed && (
          <Button
            title="I agree to book at PKR 600"
            onPress={() => setBuyerAgreed(true)}
          />
        )}
        {buyerAgreed && providerAgreed && (
          <Button
            title="Confirm Booking"
            color="green"
            onPress={() => navigation.navigate("BookingConfirmation")}
          />
        )}
      </View>

      {/* Message input */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          borderTopWidth: 1,
          borderColor: "#ddd",
        }}
      >
        <TextInput
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 5,
            padding: 8,
            marginRight: 10,
          }}
        />
        <Button title="Send" onPress={handleSendMessage} />
      </View>
    </View>
  );
}
```

#### 2.4 Update Navigation

Add new screens to App.js:

```javascript
<Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
<Stack.Screen name="Chat" component={ChatScreen} />
```

### Checklist
- [ ] Intent input screen built (text field + "Find Services" button)
- [ ] Clarification popup works (MCQ + text fallback)
- [ ] Map displays with mock providers
- [ ] Provider popups clickable
- [ ] Provider detail screen shows profile + pricing + slots + reviews
- [ ] Chat screen displays mock conversation
- [ ] Agreement buttons work (button state changes when clicked)
- [ ] Navigation flows work (map → detail → chat)

---

## **PHASE 3: BOOKING FLOW & FEEDBACK** (4-5 hours)

### Objectives
- Build booking confirmation screen
- Build time slot selection
- Build service completion/feedback screen
- Build dispute filing screen
- Build seller dashboard (basic)

### Deliverables

#### 3.1 Frontend: Booking Confirmation Screen

**BookingConfirmationScreen.js:**
- Summary of booking (provider, time, price, location)
- "Confirm Booking" button
- Mock notification sent to both buyer and seller
- Navigate to BookingsListScreen or SellerDashboard

```javascript
// screens/BookingConfirmationScreen.js
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  Alert,
} from "react-native";

export default function BookingConfirmationScreen({ navigation }) {
  const handleConfirmBooking = () => {
    // TODO: Call API /api/bookings/create
    Alert.alert("Success", "Booking confirmed! Notification sent to provider.");
    // Mock: add to Google Sheets
    console.log("Booking added to Google Sheets CRM");
    navigation.navigate("BookingsList");
  };

  // Mock booking data
  const booking = {
    provider: "Ali AC Expert",
    time: "Tomorrow, 10:00 AM",
    price: "PKR 600",
    location: "G-13, Karachi",
    service: "AC Repair",
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        Confirm Your Booking
      </Text>

      <View style={{ backgroundColor: "#f5f5f5", padding: 15, borderRadius: 8 }}>
        <Text style={{ fontSize: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold" }}>Provider:</Text> {booking.provider}
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold" }}>Service:</Text> {booking.service}
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold" }}>Time:</Text> {booking.time}
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold" }}>Location:</Text> {booking.location}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "green" }}>
          Total Price: {booking.price}
        </Text>
      </View>

      <Text style={{ fontSize: 12, color: "#666", marginTop: 20 }}>
        By confirming, you agree to our terms and conditions. The provider will receive a notification.
      </Text>

      <View style={{ marginTop: 30, gap: 10 }}>
        <Button
          title="Confirm Booking"
          color="green"
          onPress={handleConfirmBooking}
        />
        <Button title="Cancel" color="red" />
      </View>
    </ScrollView>
  );
}
```

#### 3.2 Frontend: Bookings List Screen

**BookingsListScreen.js:**
- List of user's bookings (upcoming + past)
- Each booking shows: provider, date/time, status, price
- Click booking → see details
- If completed: show "Leave Feedback" button

```javascript
// screens/BookingsListScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
} from "react-native";

export default function BookingsListScreen({ navigation }) {
  // Mock bookings
  const [bookings] = useState([
    {
      id: 1,
      provider: "Ali AC Expert",
      date: "Tomorrow, 10:00 AM",
      status: "confirmed",
      price: "PKR 600",
    },
    {
      id: 2,
      provider: "Hassan Technician",
      date: "Last week",
      status: "completed",
      price: "PKR 500",
    },
  ]);

  const renderBooking = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.status === "completed") {
          navigation.navigate("Feedback", { booking: item });
        }
      }}
      style={{
        backgroundColor: "#f5f5f5",
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "bold" }}>{item.provider}</Text>
      <Text style={{ fontSize: 12, color: "#666" }}>{item.date}</Text>
      <Text style={{ fontSize: 12, color: "#0066cc" }}>
        Status: {item.status.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 14, color: "green", fontWeight: "bold" }}>
        {item.price}
      </Text>

      {item.status === "completed" && (
        <Button
          title="Leave Feedback"
          onPress={() => navigation.navigate("Feedback", { booking: item })}
          color="#0066cc"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 15 }}>
        My Bookings
      </Text>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
}
```

#### 3.3 Frontend: Feedback Screen

**FeedbackScreen.js:**
- Star rating input (1-5)
- Text review input
- "Submit Feedback" button
- Show success message

```javascript
// screens/FeedbackScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";

export default function FeedbackScreen({ navigation, route }) {
  const { booking } = route.params;
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmitFeedback = () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    // TODO: Call API /api/feedback/submit
    console.log("Feedback submitted:", { rating, review });
    Alert.alert("Success", "Thank you for your feedback!");
    navigation.navigate("BookingsList");
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 15 }}>
        Feedback for {booking.provider}
      </Text>

      {/* Star Rating */}
      <Text style={{ fontSize: 14, marginBottom: 10 }}>Rate this service</Text>
      <View
        style={{
          flexDirection: "row",
          marginBottom: 20,
          gap: 10,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={{
              padding: 10,
              backgroundColor: rating >= star ? "#FFD700" : "#ddd",
              borderRadius: 5,
            }}
          >
            <Text style={{ fontSize: 18 }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Review Text */}
      <TextInput
        placeholder="Write your review (optional)"
        value={review}
        onChangeText={setReview}
        multiline
        numberOfLines={5}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          marginBottom: 20,
          textAlignVertical: "top",
        }}
      />

      <Button
        title="Submit Feedback"
        color="green"
        onPress={handleSubmitFeedback}
      />
    </View>
  );
}
```

#### 3.4 Frontend: Dispute Filing Screen

**DisputeScreen.js:**
- Dispute type dropdown (no-show, quality, price, cancellation, other)
- Description text input
- "File Dispute" button

```javascript
// screens/DisputeScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Picker,
  Alert,
} from "react-native";

export default function DisputeScreen({ navigation, route }) {
  const { booking } = route.params;
  const [disputeType, setDisputeType] = useState("no-show");
  const [description, setDescription] = useState("");

  const handleFileDispute = () => {
    // TODO: Call API /api/disputes/file
    console.log("Dispute filed:", { disputeType, description });
    Alert.alert(
      "Dispute Filed",
      "Your dispute has been submitted. We'll evaluate and contact you soon."
    );
    navigation.navigate("BookingsList");
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 15 }}>
        File a Dispute
      </Text>

      <Text style={{ fontSize: 14, marginBottom: 10 }}>
        Booking with {booking.provider}
      </Text>

      {/* Dispute Type */}
      <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>
        What's the issue?
      </Text>
      <Picker
        selectedValue={disputeType}
        onValueChange={setDisputeType}
        style={{ marginBottom: 20 }}
      >
        <Picker.Item label="No-show (provider didn't arrive)" value="no-show" />
        <Picker.Item label="Quality issue" value="quality" />
        <Picker.Item label="Price disagreement" value="price" />
        <Picker.Item label="Cancellation" value="cancellation" />
        <Picker.Item label="Other" value="other" />
      </Picker>

      {/* Description */}
      <TextInput
        placeholder="Describe the issue..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          marginBottom: 20,
          textAlignVertical: "top",
        }}
      />

      <Button
        title="File Dispute"
        color="red"
        onPress={handleFileDispute}
      />
    </View>
  );
}
```

#### 3.5 Frontend: Seller Dashboard (Basic)

**SellerDashboard.js:**
- Current active booking (highlighted)
- Next scheduled bookings (list)
- Booking details for next one (customer name, rating, time)
- "Mark as Complete" button for active booking
- Past bookings list

```javascript
// screens/SellerDashboard.js
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
} from "react-native";

export default function SellerDashboard({ navigation }) {
  // Mock bookings
  const [activeBooking] = useState({
    id: 1,
    customer: "Ahmed",
    customerRating: 4.7,
    time: "Today, 10:00 AM",
    location: "G-13, Karachi",
    status: "active",
  });

  const [nextBookings] = useState([
    {
      id: 2,
      customer: "Fatima",
      time: "Today, 2:00 PM",
      location: "DHA, Karachi",
    },
    {
      id: 3,
      customer: "Hassan",
      time: "Tomorrow, 9:00 AM",
      location: "Clifton, Karachi",
    },
  ]);

  const handleMarkComplete = () => {
    // TODO: Call API /api/bookings/complete
    console.log("Booking marked as complete");
    // Move to next booking, etc.
  };

  return (
    <ScrollView style={{ padding: 15 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        My Dashboard
      </Text>

      {/* Active Booking */}
      <View style={{ backgroundColor: "#e8f5e9", padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "green" }}>
          Active Booking
        </Text>
        <Text style={{ fontSize: 14, marginTop: 10 }}>
          Customer: {activeBooking.customer}
        </Text>
        <Text style={{ fontSize: 12, color: "#666" }}>
          Rating: ⭐ {activeBooking.customerRating}
        </Text>
        <Text style={{ fontSize: 14, marginTop: 10 }}>
          Time: {activeBooking.time}
        </Text>
        <Text style={{ fontSize: 14 }}>Location: {activeBooking.location}</Text>

        <Button
          title="Mark as Complete"
          color="green"
          onPress={handleMarkComplete}
        />
      </View>

      {/* Next Bookings */}
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
        Next Bookings
      </Text>
      <FlatList
        data={nextBookings}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#f5f5f5",
              padding: 12,
              marginBottom: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.customer}</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>{item.time}</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>{item.location}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
      />
    </ScrollView>
  );
}
```

#### 3.6 Update Navigation

Add screens to App.js:

```javascript
<Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
<Stack.Screen name="BookingsList" component={BookingsListScreen} />
<Stack.Screen name="Feedback" component={FeedbackScreen} />
<Stack.Screen name="Dispute" component={DisputeScreen} />
<Stack.Screen name="SellerDashboard" component={SellerDashboard} />
```

### Checklist
- [ ] Booking confirmation screen shows all details
- [ ] Bookings list displays upcoming + past bookings
- [ ] Feedback screen with star rating + text input
- [ ] Dispute filing screen with dropdown + description
- [ ] Seller dashboard shows active booking + next bookings
- [ ] All screens have working navigation
- [ ] Mock data flows end-to-end (auth → intent → booking → feedback/dispute)

---

## **PHASE 4: BACKEND APIS & INTEGRATION** (8-10 hours)

### Objectives
- Build all backend APIs
- Wire frontend to real APIs (one endpoint at a time)
- Handle Supabase queries
- Add error handling

### Deliverables

#### 4.1 Backend: Authentication APIs

**routes/auth.js:**

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");

// Send OTP (mock)
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  // TODO: Actually send SMS (for now, mock)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[MOCK] OTP sent to ${phone}: ${otp}`);

  // Store in Redis or DB (with expiry)
  // For hackathon, just log it

  res.json({ message: "OTP sent", mock_otp: otp });
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  // TODO: Verify OTP from Redis/DB

  // Check if user exists
  let { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!user) {
    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([{ phone }])
      .select()
      .single();

    if (createError) {
      return res.status(500).json({ error: "Failed to create user" });
    }
    user = newUser;
  }

  // Generate JWT
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user });
});

module.exports = router;
```

**routes/user.js:**

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authMiddleware = require("../middleware/auth");

// Select role
router.post("/select-role", authMiddleware, async (req, res) => {
  const { role } = req.body;
  const userId = req.user.userId;

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Role updated" });
});

// Update profile
router.post("/profile", authMiddleware, async (req, res) => {
  const { name, cnic, businessName, specialization } = req.body;
  const userId = req.user.userId;

  // Update users table
  await supabase
    .from("users")
    .update({ name, cnic })
    .eq("id", userId);

  // If seller, create provider record
  const user = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (user.data.role === "seller") {
    await supabase.from("providers").insert([
      {
        user_id: userId,
        business_name: businessName,
        specialization,
      },
    ]);
  }

  res.json({ message: "Profile updated" });
});

module.exports = router;
```

#### 4.2 Backend: Intent Parsing API

**controllers/intentController.js:**

```javascript
const { callAntigravity } = require("../utils/antigravity");
const { resolveLocation } = require("../utils/googleMaps");

async function parseIntent(userInput) {
  // Step 1: Try Urdu BERT (if available)
  let entityString = userInput;
  try {
    // TODO: Call Urdu BERT API
    // const urduResult = await callUrduBERT(userInput);
    // entityString = JSON.stringify(urduResult);
  } catch (error) {
    console.log("Urdu BERT unavailable, using Antigravity only");
  }

  // Step 2: Call Antigravity for intent parsing
  const systemPrompt = `You are an intent parsing agent for a service booking system in Pakistan.
Extract: SERVICE_TYPE, LOCATION, TIME_REQUESTED, URGENCY, BUDGET_SENSITIVITY.
Output ONLY valid JSON (no markdown, no preamble) with:
{
  "service_type": "string",
  "location": "string",
  "time_requested": { "start": "datetime", "end": "datetime" },
  "urgency": "ASAP|same_day|planned",
  "budget_sensitivity": "high|medium|low",
  "confidence_scores": { "service_type": 0.9, "location": 0.7, ... },
  "clarification_questions": ["question1", "question2"] // if any confidence < 0.7
}`;

  const userPrompt = `Parse this request: "${userInput}"
Additional entity data: ${entityString}
Today's date: ${new Date().toISOString().split("T")[0]}`;

  try {
    const result = await callAntigravity(systemPrompt, userPrompt);
    const parsed = JSON.parse(result);

    // Step 3: Resolve location ambiguity
    if (parsed.location) {
      const locationResolution = await resolveLocation(parsed.location);
      if (locationResolution.ambiguous) {
        parsed.location_options = locationResolution.options;
        parsed.clarification_questions.push(
          "Which exact location? " +
            locationResolution.options.map((o) => o.formatted_address).join(" or ")
        );
      } else {
        parsed.location = locationResolution.location;
      }
    }

    return parsed;
  } catch (error) {
    return {
      error: "Failed to parse intent",
      message: error.message,
    };
  }
}

module.exports = { parseIntent };
```

**routes/antigravity.js:**

```javascript
const express = require("express");
const router = express.Router();
const { parseIntent } = require("../controllers/intentController");

router.post("/intent/parse", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "userInput required" });
  }

  const result = await parseIntent(userInput);

  if (result.error) {
    return res.status(500).json(result);
  }

  res.json(result);
});

router.post("/intent/clarify", async (req, res) => {
  const { userInput, clarificationAnswers } = req.body;

  // Re-parse with clarification context
  // For now, just call parseIntent again with updated input
  const updatedInput = `${userInput} (Clarification: ${clarificationAnswers.join(", ")})`;
  const result = await parseIntent(updatedInput);

  res.json(result);
});

module.exports = router;
```

#### 4.3 Backend: Provider Matching API

**controllers/matchingController.js:**

```javascript
const supabase = require("../utils/supabase");
const { getGoogleMapsDistance } = require("../utils/googleMaps");
const { callAntigravity } = require("../utils/antigravity");

async function getAvailableProviders(intent) {
  const { service_type, location } = intent;
  const { lat, lng } = location;

  // Step 1: Get all providers with service type
  const { data: providerServices, error } = await supabase
    .from("provider_services")
    .select("provider_id, service_type, base_rate")
    .eq("service_type", service_type);

  if (error || !providerServices) {
    return { error: "No providers found", providers: [] };
  }

  const providerIds = providerServices.map((ps) => ps.provider_id);

  // Step 2: Get provider details
  const { data: providers } = await supabase
    .from("providers")
    .select("*")
    .in("id", providerIds);

  // Step 3: Filter by distance (10km) and availability
  const nearby = [];
  for (const provider of providers) {
    const distance = haversineDistance(
      lat,
      lng,
      provider.lat,
      provider.lng
    );

    if (distance <= 10) {
      const hasSlots = await hasAvailableSlots(
        provider.id,
        intent.time_requested.start,
        intent.time_requested.end
      );

      if (hasSlots) {
        // Get travel time
        const travelTime = await getGoogleMapsDistance(
          { lat, lng },
          { lat: provider.lat, lng: provider.lng }
        );

        provider.distance_km = distance;
        provider.travel_time_mins = travelTime.duration_mins;
        provider.base_rate =
          providerServices.find((ps) => ps.provider_id === provider.id)
            ?.base_rate || 500;

        nearby.push(provider);
      }
    }
  }

  return { providers: nearby, error: null };
}

async function hasAvailableSlots(providerId, startTime, endTime) {
  const { data: bookedSlots } = await supabase
    .from("booking_slots")
    .select("*")
    .eq("provider_id", providerId)
    .eq("status", "booked");

  // Simple check: if any gaps exist, return true
  // TODO: Implement proper gap calculation
  return !bookedSlots || bookedSlots.length === 0;
}

async function rankProviders(intent, availableProviders) {
  const providersData = availableProviders.map((p) => ({
    id: p.id,
    name: p.user_id, // TODO: Get actual name from users table
    business_name: p.business_name,
    location: { lat: p.lat, lng: p.lng },
    rating: p.base_rating || 4.5,
    on_time_score: p.on_time_score || 4.5,
    cancellation_rate: p.cancellation_rate || 0,
    specialization: p.specialization,
    base_rate: p.base_rate,
    distance_km: p.distance_km,
    travel_time_mins: p.travel_time_mins,
  }));

  const systemPrompt = `You are a matching agent for service providers in Pakistan.
Rank providers using these factors:
1. Distance/Travel time (prefer closer)
2. Availability (must have free slots)
3. Rating (higher is better)
4. On-time score (reliability critical)
5. Specialization match (AC repair expert > generalist)
6. Cancellation rate (lower is better)
7. Price competitiveness

Return ONLY valid JSON (no markdown, no preamble):
[
  { "provider_id": "uuid", "score": 95, "reasoning": "..." },
  ...
]`;

  const userPrompt = `Intent: ${JSON.stringify(intent)}
Providers: ${JSON.stringify(providersData)}
Rank these providers (top 5 only).`;

  try {
    const result = await callAntigravity(systemPrompt, userPrompt);
    const ranked = JSON.parse(result);
    return ranked.slice(0, 5);
  } catch (error) {
    console.error("Antigravity ranking failed:", error);
    // Fallback: sort by rating
    return providersData
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((p, idx) => ({
        provider_id: p.id,
        score: 100 - idx * 10,
        reasoning: "Fallback ranking due to Antigravity error",
      }));
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { getAvailableProviders, rankProviders };
```

**routes/providers.js:**

```javascript
const express = require("express");
const router = express.Router();
const { getAvailableProviders, rankProviders } = require("../controllers/matchingController");
const supabase = require("../utils/supabase");

router.post("/match", async (req, res) => {
  const { intent } = req.body;

  const { providers, error } = await getAvailableProviders(intent);

  if (error) {
    return res.status(500).json({ error });
  }

  const ranked = await rankProviders(intent, providers);

  res.json({ providers: ranked });
});

router.get("/:providerId/details", async (req, res) => {
  const { providerId } = req.params;

  const { data: provider, error } = await supabase
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Provider not found" });
  }

  // Get reviews
  const { data: reviews } = await supabase
    .from("provider_reviews")
    .select("*")
    .eq("provider_id", providerId)
    .limit(5);

  // Calculate risk score
  const { data: disputes } = await supabase
    .from("disputes")
    .select("*")
    .eq("provider_id", providerId)
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );

  const { data: cancellations } = await supabase
    .from("provider_cancellations")
    .select("*")
    .eq("provider_id", providerId);

  const riskScore =
    (disputes?.length || 0) * 0.1 + (cancellations?.length || 0) * 0.15;

  res.json({
    provider,
    reviews,
    risk_score: Math.min(riskScore, 1),
  });
});

module.exports = router;
```

#### 4.4 Backend: Pricing API

**controllers/pricingController.js:**

```javascript
const { callAntigravity } = require("../utils/antigravity");

async function generatePriceQuote(intent, provider) {
  const { service_type, urgency } = intent;
  const { base_rate, distance_km } = provider;

  const systemPrompt = `You are a pricing agent.
Calculate service price with breakdown:
- Base rate (provider's rate)
- Distance cost (PKR 20/km)
- Urgency multiplier (1.5x for 1-2 hour, 1.2x for same-day, 1.0x for planned)
- Complexity factor (basic=1.0, intermediate=1.1, complex=1.2)

Return ONLY valid JSON (no markdown):
{
  "base_rate": number,
  "distance_cost": number,
  "urgency_multiplier": number,
  "complexity_factor": number,
  "loyalty_discount": number,
  "final_price": number,
  "breakdown": { ... },
  "fairness_note": "..."
}`;

  const userPrompt = `
Provider base rate: PKR ${base_rate}
Distance: ${distance_km}km
Service type: ${service_type}
Urgency: ${urgency}
Complexity: intermediate (inferred)
Calculate final price.`;

  try {
    const result = await callAntigravity(systemPrompt, userPrompt);
    return JSON.parse(result);
  } catch (error) {
    // Fallback calculation
    const distanceCost = distance_km * 20;
    const urgencyMultiplier = urgency === "ASAP" ? 1.5 : urgency === "same_day" ? 1.2 : 1.0;
    const finalPrice = (base_rate + distanceCost) * urgencyMultiplier;

    return {
      base_rate,
      distance_cost: distanceCost,
      urgency_multiplier: urgencyMultiplier,
      complexity_factor: 1.1,
      final_price: Math.round(finalPrice),
      breakdown: { base_rate, distance_cost: distanceCost, urgency_multiplier: urgencyMultiplier },
      fairness_note: "Fallback pricing due to API error",
    };
  }
}

module.exports = { generatePriceQuote };
```

**routes/bookings.js** (pricing endpoint):

```javascript
const express = require("express");
const router = express.Router();
const { generatePriceQuote } = require("../controllers/pricingController");
const authMiddleware = require("../middleware/auth");

router.post("/quote", authMiddleware, async (req, res) => {
  const { intent, provider } = req.body;

  const quote = await generatePriceQuote(intent, provider);

  res.json(quote);
});

module.exports = router;
```

#### 4.5 Backend: Booking & Chat APIs

**routes/bookings.js** (complete):

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authMiddleware = require("../middleware/auth");
const googleSheetsService = require("../services/googleSheetsService");

// Create booking
router.post("/create", authMiddleware, async (req, res) => {
  const { provider_id, price, confirmed_time, location, service_type } = req.body;
  const buyer_id = req.user.userId;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert([
      {
        buyer_id,
        provider_id,
        price,
        confirmed_time,
        location,
        service_type,
        status: "confirmed",
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Add to booking_slots
  const endTime = new Date(new Date(confirmed_time).getTime() + 60 * 60 * 1000); // 1 hour
  await supabase.from("booking_slots").insert([
    {
      provider_id,
      start_time: confirmed_time,
      end_time: endTime.toISOString(),
      status: "booked",
      booking_id: booking.id,
    },
  ]);

  // Add to Google Sheets
  await googleSheetsService.addBooking(booking);

  // TODO: Send notifications to buyer and provider

  res.json({ booking });
});

// Mark booking as complete
router.post("/:bookingId/complete", authMiddleware, async (req, res) => {
  const { bookingId } = req.params;

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "Booking completed" });
});

// Cancel booking
router.post("/:bookingId/cancel", authMiddleware, async (req, res) => {
  const { bookingId } = req.params;
  const providerId = req.body.provider_id;

  // Mark as cancelled
  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  // Record cancellation
  if (providerId) {
    await supabase.from("provider_cancellations").insert([
      {
        provider_id: providerId,
        booking_id: bookingId,
      },
    ]);
  }

  res.json({ message: "Booking cancelled" });
});

module.exports = router;
```

**routes/chat.js:**

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authMiddleware = require("../middleware/auth");
const { callAntigravity } = require("../utils/antigravity");

router.post("/:bookingId/send", authMiddleware, async (req, res) => {
  const { bookingId } = req.params;
  const { message } = req.body;
  const senderId = req.user.userId;

  // Save message
  const { data: msg, error } = await supabase
    .from("chats")
    .insert([
      {
        booking_id: bookingId,
        sender_id: senderId,
        message,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Extract price if mentioned (Antigravity)
  const systemPrompt = `Extract price mentioned in message. If found, return JSON: { "price": number }. If not found, return: { "price": null }`;
  const userPrompt = `Message: "${message}"`;

  try {
    const result = await callAntigravity(systemPrompt, userPrompt);
    const { price } = JSON.parse(result);

    if (price) {
      await supabase
        .from("chats")
        .update({ extracted_price: price })
        .eq("id", msg.id);
    }
  } catch (error) {
    console.log("Price extraction failed, continuing...");
  }

  res.json({ message: msg });
});

router.get("/:bookingId/messages", authMiddleware, async (req, res) => {
  const { bookingId } = req.params;

  const { data: messages, error } = await supabase
    .from("chats")
    .select("*")
    .eq("booking_id", bookingId)
    .order("timestamp", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ messages });
});

module.exports = router;
```

#### 4.6 Backend: Feedback & Disputes APIs

**routes/feedback.js:**

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authMiddleware = require("../middleware/auth");
const { callAntigravity } = require("../utils/antigravity");

router.post("/submit", authMiddleware, async (req, res) => {
  const { booking_id, rating, text_review } = req.body;
  const buyer_id = req.user.userId;

  // Get booking details to find provider
  const { data: booking } = await supabase
    .from("bookings")
    .select("provider_id, service_type")
    .eq("id", booking_id)
    .single();

  // Insert review
  const { data: review, error } = await supabase
    .from("provider_reviews")
    .insert([
      {
        provider_id: booking.provider_id,
        buyer_id,
        rating,
        text_review,
        service_type: booking.service_type,
        verified_by_antigravity: false,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // TODO: Verify review with Antigravity (check for spam, fairness, etc.)

  // Recalculate provider's rating
  const { data: allReviews } = await supabase
    .from("provider_reviews")
    .select("rating")
    .eq("provider_id", booking.provider_id);

  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await supabase
    .from("providers")
    .update({ base_rating: avgRating })
    .eq("id", booking.provider_id);

  res.json({ review, new_rating: avgRating });
});

module.exports = router;
```

**routes/disputes.js:**

```javascript
const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const authMiddleware = require("../middleware/auth");
const { callAntigravity } = require("../utils/antigravity");

router.post("/file", authMiddleware, async (req, res) => {
  const { booking_id, dispute_type, description } = req.body;
  const filer_id = req.user.userId;

  // Get booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();

  // Create dispute
  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert([
      {
        booking_id,
        filer_id,
        dispute_type,
        description,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Use Antigravity to evaluate dispute
  const systemPrompt = `You are a dispute evaluator.
Given dispute details, suggest resolution:
- Refund amount (if applicable)
- Rebook option (offer rebooking with different provider)
- Escalation (if needed)

Return JSON: { "evaluation": "...", "suggested_resolution": "refund|rebook|escalate", "amount": number }`;

  const userPrompt = `
Dispute type: ${dispute_type}
Description: ${description}
Original price: ${booking.price}
Provider's cancellation rate: (TODO: fetch from DB)
Evaluate and suggest resolution.`;

  try {
    const evaluation = await callAntigravity(systemPrompt, userPrompt);
    const result = JSON.parse(evaluation);

    await supabase
      .from("disputes")
      .update({
        antigravity_evaluation: JSON.stringify(result),
        resolution: result.suggested_resolution,
      })
      .eq("id", dispute.id);

    res.json({ dispute: { ...dispute, ...result } });
  } catch (error) {
    res.json({ dispute, error: "Evaluation failed" });
  }
});

module.exports = router;
```

#### 4.7 Middleware & Utils

**middleware/auth.js:**

```javascript
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

**utils/antigravity.js:**

```javascript
const Anthropic = require("@anthropic-ai/sdk");
const NodeCache = require("node-cache");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

async function callAntigravity(systemPrompt, userPrompt) {
  // Check cache
  const cacheKey = `${systemPrompt}|${userPrompt}`.substring(0, 100);
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log("[CACHE HIT]");
    return cached;
  }

  console.log("[ANTIGRAVITY] Calling API...");

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const result = response.content[0].text;

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

module.exports = { callAntigravity };
```

**utils/googleMaps.js:**

```javascript
const axios = require("axios");

async function getGoogleMapsDistance(from, to) {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${from.lat},${from.lng}`,
          destinations: `${to.lat},${to.lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const element = response.data.rows[0].elements[0];

    return {
      distance_km: element.distance.value / 1000,
      duration_mins: Math.round(element.duration.value / 60),
    };
  } catch (error) {
    console.error("Google Maps API error:", error);
    // Fallback: estimate 20 mins
    return { distance_km: 0, duration_mins: 20 };
  }
}

async function resolveLocation(locationName) {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: locationName,
          components: "country:PK",
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const results = response.data.results;

    if (results.length > 1) {
      return {
        ambiguous: true,
        options: results.slice(0, 3).map((r) => ({
          place_id: r.place_id,
          formatted_address: r.formatted_address,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        })),
      };
    }

    return {
      ambiguous: false,
      location: {
        place_id: results[0].place_id,
        formatted_address: results[0].formatted_address,
        lat: results[0].geometry.location.lat,
        lng: results[0].geometry.location.lng,
      },
    };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = { getGoogleMapsDistance, resolveLocation };
```

**services/googleSheetsService.js:**

```javascript
// Mock for hackathon (just log bookings)
async function addBooking(booking) {
  console.log("[GOOGLE SHEETS] Adding booking:", booking);
  // TODO: Integrate with Google Sheets API
  return booking;
}

module.exports = { addBooking };
```

### Checklist
- [ ] Auth routes working (send-otp, verify-otp, select-role)
- [ ] Intent parsing API integrated with Antigravity
- [ ] Provider matching API returning ranked providers
- [ ] Pricing API generating quotes
- [ ] Booking creation + slots management working
- [ ] Chat messages storing + price extraction
- [ ] Feedback submission updating provider ratings
- [ ] Dispute filing with Antigravity evaluation
- [ ] All errors handled gracefully
- [ ] Caching implemented for Antigravity calls

---

## **PHASE 5: ANTIGRAVITY INTEGRATION & DEMO** (4-6 hours)

### Objectives
- Ensure all Antigravity calls are logged (for traces)
- Build comprehensive Antigravity trace documentation
- Create demo video (3-5 mins)
- Create README with architecture + traces

### Deliverables

#### 5.1 Antigravity Logging

Create a tracing utility:

**utils/antigravityTracer.js:**

```javascript
const fs = require("fs");
const path = require("path");

const tracesDir = path.join(__dirname, "../traces");

// Ensure traces directory exists
if (!fs.existsSync(tracesDir)) {
  fs.mkdirSync(tracesDir);
}

async function traceAntigravityCall(agentName, systemPrompt, userPrompt, response) {
  const trace = {
    timestamp: new Date().toISOString(),
    agent: agentName,
    system_prompt: systemPrompt.substring(0, 200) + "...",
    user_prompt: userPrompt.substring(0, 200) + "...",
    response: response,
  };

  const filename = `${agentName}_${Date.now()}.json`;
  const filepath = path.join(tracesDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));

  console.log(`[TRACE] Saved to ${filename}`);
  return trace;
}

module.exports = { traceAntigravityCall };
```

Update **utils/antigravity.js** to include tracing:

```javascript
const { traceAntigravityCall } = require("./antigravityTracer");

async function callAntigravity(systemPrompt, userPrompt, agentName = "general") {
  // ... existing code ...

  const result = response.content[0].text;

  // Trace the call
  await traceAntigravityCall(agentName, systemPrompt, userPrompt, result);

  // ... cache and return ...
}
```

#### 5.2 Create README

Create **README.md** with:

```markdown
# AI Service Orchestrator - Antigravity-Powered Service Booking

## Overview
A fullstack service booking platform that uses Google Antigravity to orchestrate the entire service lifecycle from intent parsing to dispute resolution.

## Architecture

```
[Mobile App (React Native)]
        ↓
[Express.js Backend]
        ↓
[Antigravity Orchestrator] ← Central Decision Engine
        ↓
[Supabase (PostgreSQL)]
        ↓
[Google Maps API, External APIs]
```

## Workflow

### Phase 1: Intent Parsing
- User inputs: "Mujhe kal subah G-13 mein AC technician chahiye"
- Urdu BERT tokenizes (optional)
- Antigravity extracts: service_type, location, time, urgency, budget_sensitivity
- If confidence < 70%: show clarification MCQ
- Result: Structured intent with confidence scores

### Phase 2: Provider Matching
- Query providers with matching service type
- Filter by distance (10km) + availability
- Antigravity ranks using 8 factors:
  - Distance/travel time
  - Availability
  - Rating
  - On-time score
  - Specialization match
  - Cancellation rate
  - Price
  - Risk score
- Result: Top 5 ranked providers with reasoning

### Phase 3: Pricing
- Antigravity generates quote breakdown:
  - Base rate (per provider)
  - Distance cost (PKR 20/km)
  - Urgency multiplier (1.5x for ASAP, 1.2x for same-day)
  - Complexity factor (1.0-1.2x)
- Result: Final price with fairness note

### Phase 4: Booking & Chat
- User selects provider + time slot
- Live chat between buyer + seller
- Antigravity extracts agreed price from chat
- Both parties click "I agree to book at PKR XXX"
- Booking confirmed → added to Supabase + Google Sheets
- Notifications sent (in-app)
- 1-hour reminder before booking

### Phase 5: Service & Feedback
- Provider marks service as complete
- Buyer submits rating (1-5 stars) + review text
- Antigravity verifies review (checks for spam/fairness)
- Provider's rating updated
- On-time score recalculated
- Specialization relevance adjusted

### Phase 6: Disputes
- User files dispute (no-show, quality, price, etc.)
- Antigravity auto-evaluates:
  - Checks booking history
  - Analyzes chat history
  - Reviews provider's recent disputes
- Suggests resolution (refund, rebooking, escalate)
- System executes (blacklist, update cancellation rate, etc.)

## Database Schema

### users
- id (UUID)
- phone (unique)
- role (buyer/seller)
- name
- cnic

### providers
- id (UUID)
- user_id (FK)
- business_name
- location (address)
- lat, lng
- base_rating
- on_time_score
- cancellation_rate
- specialization

### provider_services
- id (UUID)
- provider_id (FK)
- service_type (string)
- base_rate (PKR)

### bookings
- id (UUID)
- buyer_id (FK)
- provider_id (FK)
- service_type
- location
- requested_time
- confirmed_time
- price
- status (pending/confirmed/completed/cancelled/disputed)

### chats
- id (UUID)
- booking_id (FK)
- sender_id (FK)
- message (text)
- extracted_price (decimal, extracted by Antigravity)
- timestamp

### disputes
- id (UUID)
- booking_id (FK)
- filer_id (FK)
- dispute_type (no-show/quality/price/etc)
- description
- antigravity_evaluation (JSON)
- resolution (refund/rebook/escalate)

### provider_reviews
- id (UUID)
- provider_id (FK)
- buyer_id (FK)
- rating (1-5)
- text_review
- service_type
- verified_by_antigravity (boolean)

### provider_cancellations
- id (UUID)
- provider_id (FK)
- booking_id (FK)
- cancelled_at (timestamp)

## Antigravity Agents

### 1. Intent Parsing Agent
**Purpose**: Extract structured intent from natural language requests

**Input**: User text (Urdu/Roman Urdu/English, code-switched)

**Output**: JSON with extracted fields + confidence scores + clarification questions

**Reasoning**: Handles multilingual input, detects ambiguities, proposes clarifications

**Trace Location**: `/traces/intent_parsing_*.json`

### 2. Matching Agent
**Purpose**: Rank providers based on multi-factor algorithm

**Input**: Parsed intent + available providers + their metrics

**Output**: Top 5 ranked providers with scoring breakdown + reasoning

**Reasoning**: Weighs factors dynamically (urgency/budget/complexity change weights)

**Trace Location**: `/traces/matching_*.json`

### 3. Pricing Agent
**Purpose**: Generate dynamic price quotes with breakdown

**Input**: Provider details + intent + demand/complexity factors

**Output**: Itemized quote + fairness explanation

**Reasoning**: Calculates transparency, explains cost components

**Trace Location**: `/traces/pricing_*.json`

### 4. Chat Monitoring Agent
**Purpose**: Extract agreed price from chat messages

**Input**: Chat messages between buyer and seller

**Output**: Extracted price or null

**Reasoning**: NLU to detect price agreements in context

**Trace Location**: `/traces/chat_monitoring_*.json`

### 5. Dispute Evaluation Agent
**Purpose**: Auto-evaluate disputes and suggest resolution

**Input**: Dispute type + description + booking history + chat history

**Output**: Evaluation + suggested resolution (refund/rebook/escalate)

**Reasoning**: Evidence-based decision making (provider history, chat records)

**Trace Location**: `/traces/dispute_evaluation_*.json`

## APIs

### Auth
- POST `/api/auth/send-otp` - Send OTP to phone
- POST `/api/auth/verify-otp` - Verify OTP, create user, return JWT

### Users
- POST `/api/user/select-role` - Select buyer or seller
- POST `/api/user/profile` - Update profile

### Intent
- POST `/api/antigravity/intent/parse` - Parse user request
- POST `/api/antigravity/intent/clarify` - Handle clarification response

### Providers
- POST `/api/providers/match` - Get ranked providers for intent
- GET `/api/providers/:id/details` - Get full provider profile

### Bookings
- POST `/api/bookings/quote` - Get price quote
- POST `/api/bookings/create` - Create booking
- POST `/api/bookings/:id/complete` - Mark complete
- POST `/api/bookings/:id/cancel` - Cancel booking

### Chat
- POST `/api/chat/:bookingId/send` - Send chat message
- GET `/api/chat/:bookingId/messages` - Get chat history

### Feedback
- POST `/api/feedback/submit` - Submit review + rating

### Disputes
- POST `/api/disputes/file` - File dispute
- GET `/api/disputes/:id` - Get dispute details + evaluation

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **LLM Orchestration**: Anthropic Antigravity (Claude Opus 4.6)
- **Maps**: Google Maps API (Distance Matrix, Places, Geocoding)
- **Caching**: Node-cache (in-memory)

## Performance & Latency
- Intent parsing: ~2-3 seconds (Antigravity API call)
- Provider matching: ~3-4 seconds (includes Google Maps API calls for 50+ providers)
- Pricing: ~1-2 seconds
- Booking confirmation: ~500ms
- **Total end-to-end flow (request → booking)**: ~10-15 seconds

## Cost Analysis
- **Antigravity calls**: ~$0.03 per intent parse, ~$0.05 per ranking
- **Google Maps**: ~$0.05 per distance matrix request
- **Supabase**: Free tier for hackathon

## Assumptions
- Provider data is fresh (updated hourly)
- Users have location access enabled
- WhatsApp/SMS available in Pakistan (mocked for hackathon)
- Antigravity has enough tokens (~100k tokens per request)
- No real-time provider location tracking (simulated for booking)

## Limitations & Future Work
- No real payment integration (cash on delivery only)
- Dispute evaluation is rule-based + Antigravity suggestions (not full ML)
- No photo/video evidence upload for disputes
- No automated job complexity classification (hardcoded for MVP)
- No demand surge pricing (could add)
- No provider earnings optimization/forecasting (could add)

## How to Run

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Add API keys to .env
npm start
```

### Frontend
```bash
cd frontend
npm install
expo start
```

## Demo Flow
See `DEMO.md` for detailed walkthrough and video timestamps.

## Antigravity Traces
All Antigravity API calls are logged to `/backend/traces/` for inspection.
See `/backend/traces/README.md` for detailed trace documentation.
```

#### 5.3 Create Trace Documentation

**backend/traces/README.md:**

```markdown
# Antigravity Traces

This directory contains detailed logs of all Antigravity (Claude API) calls made during the service booking workflow.

## How to Read Traces

Each trace file is named `{agent_name}_{timestamp}.json` and contains:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "agent": "intent_parsing",
  "system_prompt": "You are an intent parsing agent...",
  "user_prompt": "Parse this request: 'Mujhe kal...'",
  "response": "{ ... }"
}
```

## Traces Recorded

### Intent Parsing Traces
- **File**: `intent_parsing_*.json`
- **Shows**: Multilingual input → structured extraction
- **Example**: Urdu input "Mujhe kal subah G-13 mein AC chahiye" → { service: "AC repair", location: "G-13", time: "tomorrow 8am", ... }

### Matching Traces
- **File**: `matching_*.json`
- **Shows**: 8-factor ranking logic
- **Example**: 50 nearby providers → scores for distance, rating, on-time, specialization, etc. → top 5 ranked

### Pricing Traces
- **File**: `pricing_*.json`
- **Shows**: Quote breakdown calculation
- **Example**: base_rate (500) + distance_cost (50) + urgency_multiplier (1.2) = 660 PKR

### Chat Monitoring Traces
- **File**: `chat_monitoring_*.json`
- **Shows**: Price extraction from messages
- **Example**: Message "okay, 600 works" → extracted_price: 600

### Dispute Evaluation Traces
- **File**: `dispute_evaluation_*.json`
- **Shows**: Resolution suggestion logic
- **Example**: no-show dispute + provider's 2 cancellations in 30 days → suggested_resolution: "refund + blacklist 7 days"

## Key Observations

- **Confidence scores**: Intent parsing includes confidence for each field (service, location, time)
- **Reasoning transparency**: Each ranking decision includes "why this provider ranks higher"
- **Fairness notes**: Pricing agent explains cost breakdown to both parties
- **Evidence-based decisions**: Disputes evaluated on booking history, chat records, provider metrics
```

#### 5.4 Demo Video Checklist

When recording the 3-5 min demo video:

1. **Intro (30 sec)**: "This is an AI service orchestrator built with Antigravity..."
2. **Auth Flow (30 sec)**: Phone login → OTP → Role selection → Profile setup
3. **Intent Parsing (45 sec)**:
   - User speaks/types: "Mujhe kal subah G-13 mein AC technician chahiye"
   - System parses with confidence scores
   - If low confidence, show clarification popup
   - Confirm final intent
4. **Provider Matching (60 sec)**:
   - Map appears with top 5 provider popups
   - Click one → detail view
   - Show ranking reasoning: "Provider A ranked 1st because: 4.8★ on-time (weight 35%), specialization AC expert (weight 25%), distance 3km (weight 20%)..."
5. **Pricing (30 sec)**:
   - Show price breakdown in detail view
   - Click "show breakdown" → itemized costs
6. **Chat & Agreement (45 sec)**:
   - Live chat between buyer and seller
   - Negotiation: "PKR 660?" → "Can you do 600?" → "Yes, I agree to book at PKR 600"
   - Show agreement buttons updating
7. **Booking (30 sec)**:
   - Both click "I agree"
   - "Confirm Booking" button appears
   - Booking confirmed notification
8. **Service Completion (30 sec)**:
   - Provider marks service complete (seller dashboard)
   - Buyer receives notification
   - Feedback form appears
9. **Feedback (30 sec)**:
   - Buyer rates 5 stars + writes review
   - Submit feedback
10. **Dispute Simulation (45 sec)**:
    - Show a quick dispute scenario (e.g., quality complaint)
    - Antigravity evaluates
    - Show resolution suggestion
    - System updates provider's metrics

**Total**: ~5-6 minutes

**Include Antigravity traces** as screenshots or text overlay showing reasoning at key decision points.

#### 5.5 Final Checklist

### Checklist
- [ ] All Antigravity calls logged to `/traces/`
- [ ] README.md completed with full architecture + workflow
- [ ] Trace documentation created
- [ ] Demo video recorded (3-5 mins)
- [ ] Demo shows full end-to-end flow (intent → booking → feedback/dispute)
- [ ] Antigravity reasoning visible in demo (voiceover + trace screenshots)
- [ ] No errors or crashes in demo
- [ ] Mobile UI looks polished
- [ ] All APIs wired and working
- [ ] Database seeded with mock providers (for demo)

---

## **PHASE 5.5: BUILD APK & GITHUB RELEASES** (1-2 hours)

### Objectives
- Build Android APK from Expo
- Upload to GitHub Releases
- Make downloadable for graders

### Deliverables

#### 5.5a Build APK (Easiest: Expo)

**Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
```

**Step 2: Configure Expo Project**

In your `frontend/app.json`, add:

```json
{
  "expo": {
    "name": "KaamKaro",
    "slug": "kaamkaro",
    "version": "1.0.0",
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTabletMode": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermissions": "Allow $(PRODUCT_NAME) to use your location"
        }
      ]
    ]
  }
}
```

**Step 3: Build APK**

From your `frontend` directory:

```bash
# Login to Expo (if not already logged in)
eas login

# Build APK (takes 5-10 minutes in the cloud)
eas build --platform android --profile preview
```

**Step 4: Download APK**

- Expo will email you a download link
- Or check at https://expo.dev/dashboard → select your project → builds
- Download the `.apk` file

**That's it!** You now have `app.apk` ready to install.

#### 5.5b Upload to GitHub Releases

**Step 1: Create Release in GitHub**

```bash
cd your-repo-root

# Tag the current commit
git tag v1.0.0
git push origin v1.0.0
```

**Step 2: Go to GitHub Web**

1. Go to your repo: https://github.com/your-username/kaamkaro
2. Click **"Releases"** (right sidebar)
3. Click **"Create a new release"**
4. Fill in:
   - **Tag**: `v1.0.0`
   - **Release title**: `v1.0.0 - KaamKaro APK Release`
   - **Description**: 
     ```
     Download APK and install on Android device or emulator.
     
     ## Installation Instructions
     
     ### On Physical Device
     1. Download `app.apk` below
     2. Enable unknown sources: Settings → Security → Unknown Sources
     3. Open the APK file and tap "Install"
     
     ### On Android Emulator
     ```bash
     adb install app.apk
     ```
     ```
5. Click **"Attach binaries by dropping them here..."** and upload your `app.apk`
6. Click **"Publish release"**

Done! APK is now available for download.

#### 5.5c Update README with Download Link

In your main `README.md`:

```markdown
## Download & Install

### Android APK

Download the latest APK from [GitHub Releases](https://github.com/your-username/kaamkaro/releases/v1.0.0)

#### Installation

**On Physical Device:**
1. Download `app.apk` from the release page
2. Transfer to your Android phone
3. Settings → Security → Enable "Unknown Sources"
4. Open the APK file → Tap "Install"
5. Launch "KaamKaro" app

**On Android Emulator:**
```bash
# Make sure Android emulator is running
adb install app.apk

# Or from the app folder
cd frontend
adb install path-to-apk.apk
```

**Demo Video:** See `/DEMO.md` for full walkthrough

**Antigravity Traces:** See `/backend/traces/` for reasoning logs
```

#### 5.5d Checklist

- [ ] EAS CLI installed (`eas login` successful)
- [ ] `app.json` configured with app name + android settings
- [ ] APK built with `eas build --platform android --profile preview`
- [ ] APK downloaded from Expo dashboard
- [ ] GitHub release created with tag `v1.0.0`
- [ ] APK uploaded to GitHub release
- [ ] README updated with download link + installation instructions
- [ ] APK is actually installable (test on emulator: `adb install app.apk`)

---

## **BONUS: STRESS TESTING** (1-2 hours, if time permits)

### Test Scenarios

1. **No provider available**: User requests service in unpopulated area
   - Expected: "No providers found in your area. Expand search?" option
   - Show fallback behavior

2. **Provider cancels after booking**: Provider cancels 30 mins before
   - Expected: Buyer notified, offered rebooking options
   - Provider's cancellation rate increases

3. **Misspelled/ambiguous input**: "AC khabata tha, G-13 k paas hu"
   - Expected: Antigravity parses despite typo + offers clarification
   - Show confidence scores < 70%

4. **Double-booking**: Two users try to book same provider at same time
   - Expected: First-come-first-served (whoever clicks "confirm" first wins)
   - Second user sees "slot no longer available"

5. **Dispute after payment**: User disputes quality after completing service
   - Expected: Antigravity evaluates chat history + reviews
   - If provider has recent quality complaints → favor user
   - If provider has clean history → evaluate fairly

### How to Demo Stress Tests
- Have mock data with edge cases pre-loaded
- Show error messages gracefully
- Show Antigravity fallback logic

---

## **FINAL SUBMISSION CHECKLIST**

### Setup & Infrastructure
- [ ] Supabase project created + all 9 tables created
- [ ] Supabase credentials in `.env` file (SUPABASE_URL + SUPABASE_ANON_KEY)
- [ ] Test connection works (`✅ Supabase connected` message)
- [ ] Google Maps API key obtained + added to `.env`
- [ ] Anthropic API key obtained + added to `.env`
- [ ] Node.js backend runs (`npm start` in backend folder)
- [ ] React Native frontend runs (`expo start` in frontend folder)

### Frontend Development
- [ ] Frontend fully functional (all screens navigable)
- [ ] Auth flow works (OTP mock, role selection, profile setup)
- [ ] Intent input screen with text field + "Find Services" button
- [ ] Clarification popup shows (MCQ + text fallback)
- [ ] Map displays with provider popups
- [ ] Provider detail view shows profile + pricing + reviews
- [ ] Chat screen with buyer/seller messages
- [ ] "I agree to book" buttons work (both sides)
- [ ] Booking confirmation screen
- [ ] Bookings list screen
- [ ] Feedback submission screen (rating + text)
- [ ] Dispute filing screen (dropdown + description)
- [ ] Seller dashboard (active booking + next bookings)
- [ ] All navigation flows work end-to-end

### Backend Development
- [ ] Backend APIs all working (test with Postman/curl or console logs)
- [ ] Auth endpoints: `/api/auth/send-otp`, `/api/auth/verify-otp`
- [ ] Intent parsing: `/api/antigravity/intent/parse`, `/api/antigravity/intent/clarify`
- [ ] Provider matching: `/api/providers/match`
- [ ] Pricing: `/api/bookings/quote`
- [ ] Booking creation: `/api/bookings/create`
- [ ] Chat: `/api/chat/:bookingId/send`, `/api/chat/:bookingId/messages`
- [ ] Feedback: `/api/feedback/submit`
- [ ] Disputes: `/api/disputes/file`

### Antigravity Integration
- [ ] Antigravity integration complete (all 5 agents: intent, matching, pricing, chat, dispute)
- [ ] Intent parsing returns confidence scores + clarification questions
- [ ] Provider matching returns top 5 with reasoning
- [ ] Pricing generates breakdown (base + distance + urgency + complexity)
- [ ] Chat monitoring extracts agreed price
- [ ] Dispute evaluation suggests resolution
- [ ] All Antigravity calls logged to `/backend/traces/` directory
- [ ] Trace files named correctly: `intent_parsing_*.json`, `matching_*.json`, etc.
- [ ] Traces include input, output, and reasoning

### Demo & Documentation
- [ ] Demo video recorded (3-5 mins showing full flow)
- [ ] Demo shows: intent → parsing → matching → pricing → chat → booking → feedback → dispute
- [ ] Antigravity reasoning visible in demo (voiceover + trace screenshots)
- [ ] README.md complete with:
  - [ ] Architecture diagram
  - [ ] Full workflow explanation
  - [ ] Database schema
  - [ ] Antigravity agents description
  - [ ] API endpoints list
  - [ ] Tech stack
  - [ ] Performance notes
  - [ ] Limitations
  - [ ] How to run (backend + frontend)
- [ ] Trace documentation created (`/backend/traces/README.md`)
- [ ] Download link in README for APK

### APK & Deployment
- [ ] APK built with Expo (`eas build --platform android --profile preview`)
- [ ] APK downloaded and tested on emulator or device
- [ ] GitHub release created with tag `v1.0.0`
- [ ] APK uploaded to GitHub release
- [ ] Release description includes installation instructions
- [ ] README links to APK download

### Code Quality
- [ ] Code commented and clean
- [ ] No hardcoded secrets (all in `.env`)
- [ ] Error handling for API failures
- [ ] Fallback behavior for Antigravity failures (graceful degradation)
- [ ] Git history clean (sensible commits)
- [ ] `.gitignore` includes `.env`, `node_modules/`, `traces/`

### Testing
- [ ] Mock data works end-to-end (no real APIs needed to demo)
- [ ] No crashes or errors in demo
- [ ] All UI elements responsive and visible
- [ ] Navigation flows don't have dead ends

---

## **TIMELINE BREAKDOWN**

## **TIMELINE BREAKDOWN**

| Phase | Duration | What You're Building |
|-------|----------|----------------------|
| 0. Setup | 4-6 hrs | Supabase DB, Node.js backend, React Native, APIs keys |
| 1. Auth | 3-4 hrs | OTP login, role selection, profile setup |
| 2. Intent + Map | 5-6 hrs | Intent parsing UI, map with providers, detail views |
| 3. Booking + Feedback | 4-5 hrs | Chat, booking flow, feedback form, disputes, seller dashboard |
| 4. Backend APIs | 8-10 hrs | All Express.js endpoints, Supabase queries, Antigravity integration |
| 5. Antigravity + Demo | 4-6 hrs | Trace logging, README, demo video |
| 5.5 APK + Releases | 1-2 hrs | Build APK with Expo, upload to GitHub |
| **TOTAL** | **~48 hrs** | **Hackathon-ready submission** |

**Realistic timeline**: ~48-72 hours if you focus and don't get stuck debugging.

Good luck! 🚀
```

### Checklist
- [ ] All Antigravity calls logged
- [ ] README.md complete
- [ ] Trace documentation created
- [ ] Demo video recorded (3-5 mins)
- [ ] Demo includes Antigravity reasoning (voiceover + screenshots)
- [ ] All screens working end-to-end
- [ ] No errors in demo playback

---

## **SUMMARY**

You now have a **comprehensive, phase-by-phase implementation plan** that:

1. **Starts with frontend UI** (easier to visualize)
2. **Builds backend APIs** one-by-one
3. **Integrates Antigravity** for orchestration (intent, matching, pricing, chat monitoring, disputes)
4. **Logs all Antigravity traces** for grading
5. **Creates demo video + README** for submission

**Key wins:**
- ✅ Full end-to-end workflow (intent → matching → booking → feedback → dispute)
- ✅ Antigravity used for all major decisions
- ✅ Multilingual support (Urdu/Roman Urdu/English)
- ✅ Dynamic matching (8 factors)
- ✅ Transparent pricing
- ✅ Smart dispute resolution
- ✅ Comprehensive tracing + documentation

**Go build it! 🔥**