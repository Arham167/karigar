const supabase = require("../utils/supabase");
const googleSheets = require("../utils/googleSheets");
const nlpParser = require("../utils/nlpParser");

// Robust in-memory store for mock bookings and Supabase fallbacks
global.chatMemoryStore = global.chatMemoryStore || {};

const MOCK_BUYER_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MOCK_SELLER_UUID = "ssssssss-ssss-4sss-8sss-ssssssssssss";
const MOCK_BOOKING_1_ID = 9991;
const MOCK_BOOKING_2_ID = 9992;
const MOCK_BOOKING_3_ID = 9993;

function normalizeBookingId(id) {
  if (id === null || id === undefined) return MOCK_BOOKING_1_ID;
  const strId = String(id);
  if (strId.includes("mock-booking-1") || strId.includes("mock-1")) return MOCK_BOOKING_1_ID;
  if (strId.includes("mock-booking-2") || strId.includes("mock-2")) return MOCK_BOOKING_2_ID;
  if (strId.includes("mock-booking-3") || strId.includes("mock-3")) return MOCK_BOOKING_3_ID;
  if (strId.startsWith("mock-")) return MOCK_BOOKING_1_ID;
  
  if (/^\d+$/.test(strId)) {
    return parseInt(strId, 10);
  }
  return id;
}

function normalizeUserId(id, role = "buyer") {
  if (!id) return role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID;
  const strId = String(id);
  if (strId.includes("buyer")) return MOCK_BUYER_UUID;
  if (strId.includes("seller")) return MOCK_SELLER_UUID;
  if (strId.startsWith("mock-")) return role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID;
  return id;
}

async function ensureMockRecordsExist() {
  if (global.mockRecordsSeeded) return;

  try {
    // 1. Ensure mock buyer exists in profiles table
    const { data: buyer } = await supabase.from("profiles").select("id").eq("id", MOCK_BUYER_UUID).single();
    if (!buyer) {
      await supabase.from("profiles").insert([{ id: MOCK_BUYER_UUID, phone_number: "03001234567", role: "buyer", name: "Arham Noman (Mock Buyer)" }]);
    }

    // 2. Ensure mock seller exists in profiles table
    const { data: sellerUser } = await supabase.from("profiles").select("id").eq("id", MOCK_SELLER_UUID).single();
    if (!sellerUser) {
      await supabase.from("profiles").insert([{ id: MOCK_SELLER_UUID, phone_number: "03007654321", role: "seller", name: "Bilal Plumber (Mock Seller)" }]);
    }

    // 3. Ensure mock seller exists in providers table
    const { data: provider } = await supabase.from("providers").select("id").eq("id", MOCK_SELLER_UUID).single();
    if (!provider) {
      await supabase.from("providers").insert([{ id: MOCK_SELLER_UUID, user_id: MOCK_SELLER_UUID, business_name: "Bilal Plumber Services", specialization: "Plumbing" }]);
    }

    // 4. Ensure mock bookings exist in bookings table
    const mockBookings = [
      { id: MOCK_BOOKING_1_ID, buyer_id: MOCK_BUYER_UUID, seller_id: MOCK_SELLER_UUID, service_type: "Ceiling Fan & Board Wiring", status: "pending", price: 800 },
      { id: MOCK_BOOKING_2_ID, buyer_id: MOCK_BUYER_UUID, seller_id: MOCK_SELLER_UUID, service_type: "Pipe Leakage Repair", status: "pending", price: 1200 },
      { id: MOCK_BOOKING_3_ID, buyer_id: MOCK_BUYER_UUID, seller_id: MOCK_SELLER_UUID, service_type: "AC Servicing & Gas Refill", status: "pending", price: 2500 }
    ];

    for (const mb of mockBookings) {
      const { data: existingBooking } = await supabase.from("bookings").select("id").eq("id", mb.id).single();
      if (!existingBooking) {
        await supabase.from("bookings").insert([mb]);
      }
    }

    global.mockRecordsSeeded = true;
    console.log("[Mock Seeder] Successfully verified/seeded mock profiles and bookings in Supabase.");
  } catch (err) {
    console.error("[Mock Seeder] Error seeding mock records:", err.message);
  }
}

// 1. Fetch chat messages for a specific booking
exports.getMessages = async (req, res) => {
  const rawBookingId = req.params.bookingId;
  console.log(`[ChatController - getMessages] Request received for bookingId: ${rawBookingId}`);
  if (!rawBookingId) {
    console.error(`[ChatController - getMessages] Missing Booking ID.`);
    return res.status(400).json({ success: false, error: "Booking ID is required." });
  }

  const normId = normalizeBookingId(rawBookingId);
  await ensureMockRecordsExist();

  try {
    const { data: messages, error } = await supabase
      .from("chats")
      .select("*")
      .eq("booking_id", normId)
      .order("timestamp", { ascending: true });

    if (error) {
      if (error.code === "PGRST205" || error.message.includes("does not exist")) {
        console.warn(`[ChatController - getMessages] Chats table missing. Using memory fallback for bookingId: ${normId}`);
        const memMessages = global.chatMemoryStore[normId] || [];
        return res.status(200).json({ success: true, messages: memMessages, dbWarning: "chats_table_missing" });
      }
      throw error;
    }

    // Merge Supabase messages with memory store messages (to ensure 100% sync even if DB had transient issues)
    const existingIds = new Set((messages || []).map(m => m.id));
    const memMessages = global.chatMemoryStore[normId] || [];
    const combined = [...(messages || [])];

    for (const mm of memMessages) {
      if (!existingIds.has(mm.id)) {
        combined.push(mm);
        existingIds.add(mm.id);
      }
    }

    combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(`[ChatController - getMessages] Successfully retrieved ${combined.length} messages for bookingId: ${normId}`);

    return res.status(200).json({ success: true, messages: combined });
  } catch (err) {
    console.error("[ChatController - getMessages] Error fetching chat messages:", err.message, err.stack);
    const memMessages = global.chatMemoryStore[normId] || [];
    return res.status(200).json({ success: true, messages: memMessages, fallback: true });
  }
};

// 2. Send a new chat message
exports.sendMessage = async (req, res) => {
  const { bookingId, senderId, message, price } = req.body;
  console.log(`[ChatController - sendMessage] Request received. Sender: ${senderId}, Booking: ${bookingId}, Message: "${message}"`);

  if (!bookingId || !senderId || !message) {
    console.error(`[ChatController - sendMessage] Missing required fields.`);
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  const normId = normalizeBookingId(bookingId);
  const normSenderId = normalizeUserId(senderId, req.body.role || "buyer");
  await ensureMockRecordsExist();

  // ----- DYNAMIC PRICING EXTRACTION -----
  let extractedPrice = price || null;
  
  if (!extractedPrice) {
    const hasPricing = /\b(rs|rupees|price|cost|quote|thousand|hundred|\d{3,})\b/i.test(message);
    if (hasPricing) {
      try {
        console.log(`[ChatController - sendMessage] Pricing keywords detected. Calling NLP extractor...`);
        const p = await nlpParser.extractPrice(message);
        if (p !== null) {
          extractedPrice = p;
          console.log(`[ChatController - sendMessage] Gemini extracted dynamic price: ${extractedPrice} from message: "${message}"`);
        } else {
          console.log(`[ChatController - sendMessage] NLP extractor did not find a valid price.`);
        }
      } catch (err) {
        console.error("[ChatController - sendMessage] Error extracting price:", err.message);
      }
    }
  }
  // ----------------------------------------

  // Always store in memory store as a robust backup/mock handler
  if (!global.chatMemoryStore[normId]) {
    global.chatMemoryStore[normId] = [];
  }

  const newMsgObj = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
    booking_id: normId,
    sender_id: normSenderId,
    message: message,
    extracted_price: extractedPrice,
    timestamp: new Date().toISOString()
  };

  global.chatMemoryStore[normId].push(newMsgObj);

  try {
    // Ensure sender exists in public.profiles table to prevent foreign key violation!
    const { data: existingUser } = await supabase.from("profiles").select("id").eq("id", normSenderId).single();
    if (!existingUser) {
      console.log(`[ChatController - sendMessage] Creating missing user profile for sender: ${normSenderId}`);
      await supabase.from("profiles").insert([{
        id: normSenderId,
        phone_number: "phone-" + normSenderId.substr(0, 8),
        role: req.body.role || "buyer",
        name: req.body.senderName || "App User"
      }]);
    }

    // 1. Verify that the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, buyer_id, seller_id, price")
      .eq("id", normId)
      .single();

    if (bookingError || !booking) {
      console.warn(`[ChatController - sendMessage] Booking session not found in DB. Msg stored in memory. Booking: ${normId}`);
      return res.status(201).json({ success: true, message: newMsgObj, fallback: true });
    }

    // Update booking price dynamically if a new price was discussed
    if (extractedPrice && extractedPrice != booking.price) {
      console.log(`[ChatController - sendMessage] Updating booking price from ${booking.price} to ${extractedPrice}. Resetting agreements.`);
      const { error: priceUpdateError } = await supabase
        .from("bookings")
        .update({ 
          price: extractedPrice,
          buyer_agreed: false,
          seller_agreed: false
        })
        .eq("id", normId);
        
      if (priceUpdateError) {
        console.warn(`[ChatController - sendMessage] Could not update booking price:`, priceUpdateError.message);
      }
    }

    // 2. Insert chat message into Supabase
    const { data: newMessage, error } = await supabase
      .from("chats")
      .insert([
        {
          booking_id: normId,
          sender_id: normSenderId,
          message: message,
          extracted_price: extractedPrice
        }
      ])
      .select();

    if (error) {
      if (error.code === "PGRST205") {
        console.warn(`[ChatController - sendMessage] Chats table missing. Message sent mocked.`);
        return res.status(201).json({
          success: true,
          message: newMsgObj,
          dbWarning: "chats_table_missing"
        });
      }
      throw error;
    }

    console.log(`[ChatController - sendMessage] Message successfully sent and stored in DB. Msg ID: ${newMessage[0].id}`);
    return res.status(201).json({ success: true, message: newMessage[0] });
  } catch (err) {
    console.error("[ChatController - sendMessage] Error sending chat message:", err.message, err.stack);
    // Return success anyway since it's safely in memory store
    return res.status(201).json({ success: true, message: newMsgObj, fallback: true });
  }
};

// 3. Mark agreement to book
exports.agreeToBook = async (req, res) => {
  const { bookingId, userId, role, price } = req.body;
  console.log(`[ChatController - agreeToBook] Request received. Booking: ${bookingId}, User: ${userId}, Role: ${role}, Price: ${price}`);

  if (!bookingId || !userId || !role) {
    console.error(`[ChatController - agreeToBook] Missing required fields.`);
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  const normId = normalizeBookingId(bookingId);

  try {
    // Fetch current booking status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", normId)
      .single();

    if (fetchError || !booking) {
      console.warn(`[ChatController - agreeToBook] Booking negotiation not found for ID: ${normId}`);
      return res.status(404).json({ success: false, error: "Booking negotiation not found." });
    }

    const updates = {};
    if (role === "buyer") {
      updates.buyer_agreed = true;
      console.log(`[ChatController - agreeToBook] Buyer agreed.`);
    } else if (role === "seller") {
      updates.seller_agreed = true;
      console.log(`[ChatController - agreeToBook] Seller agreed.`);
    } else {
      console.error(`[ChatController - agreeToBook] Invalid role: ${role}`);
      return res.status(400).json({ success: false, error: "Invalid role specified." });
    }

    // Update the price if dynamic price is agreed upon
    if (price) {
      updates.price = price;
      console.log(`[ChatController - agreeToBook] Setting negotiated price to: ${price}`);
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", normId)
      .select();

    if (updateError) {
      // Fallback if columns don't exist yet in the database
      if (updateError.message.includes("column") && updateError.message.includes("does not exist")) {
        console.warn(`[ChatController - agreeToBook] Agreement columns missing in bookings table. Mocking success.`);
        
        // Mock the state returned
        const mockBooking = {
          ...booking,
          ...updates,
        };
        const bothAgreed = mockBooking.buyer_agreed && mockBooking.seller_agreed;

        return res.status(200).json({
          success: true,
          booking: mockBooking,
          bothAgreed: bothAgreed,
          dbWarning: "agreement_columns_missing"
        });
      }
      throw updateError;
    }

    const finalBooking = updatedBooking[0];
    const bothAgreed = finalBooking.buyer_agreed && finalBooking.seller_agreed;

    // IF AGREEMENT IS SUCCESSFUL, SYNC TO GOOGLE SHEETS WILL HAPPEN ON CONFIRMATION
    if (bothAgreed) {
      console.log(`[ChatController - agreeToBook] BOTH PARTIES AGREED! Price negotiation finalized for booking ${normId}. Ready for checkout.`);
    } else {
      console.log(`[ChatController - agreeToBook] Awaiting other party. Current status -> buyer_agreed: ${finalBooking.buyer_agreed}, seller_agreed: ${finalBooking.seller_agreed}`);
    }

    return res.status(200).json({
      success: true,
      booking: finalBooking,
      bothAgreed: bothAgreed
    });
  } catch (err) {
    console.error("[ChatController - agreeToBook] Error updating booking agreement:", err.message, err.stack);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Fetch negotiation agreement status
exports.getAgreementStatus = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ success: false, error: "Booking ID is required." });
  }

  const normId = normalizeBookingId(bookingId);

  try {
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", normId)
      .single();

    if (error) {
      throw error;
    }

    // Try to inspect columns, fallback to false if missing in schema
    const buyerAgreed = booking.buyer_agreed || false;
    const sellerAgreed = booking.seller_agreed || false;
    const bothAgreed = buyerAgreed && sellerAgreed;

    return res.status(200).json({
      success: true,
      buyerAgreed,
      sellerAgreed,
      bothAgreed,
      booking
    });
  } catch (err) {
    console.error("Error fetching agreement status:", err);
    // If the columns don't exist yet, return a clean mock response
    if (err.message.includes("column") && err.message.includes("does not exist")) {
      return res.status(200).json({
        success: true,
        buyerAgreed: false,
        sellerAgreed: false,
        bothAgreed: false,
        dbWarning: "agreement_columns_missing"
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};
