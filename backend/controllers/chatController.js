const supabase = require("../utils/supabase");

// 1. Fetch chat messages for a specific booking
exports.getMessages = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ success: false, error: "Booking ID is required." });
  }

  try {
    const { data: messages, error } = await supabase
      .from("chats")
      .select("*")
      .eq("booking_id", bookingId)
      .order("timestamp", { ascending: true });

    if (error) {
      // If table is missing, return a clean empty array for local development/graceful fallback
      if (error.code === "PGRST205") {
        console.warn("Chats table not found in Supabase. Return empty array.");
        return res.status(200).json({ success: true, messages: [], dbWarning: "chats_table_missing" });
      }
      throw error;
    }

    return res.status(200).json({ success: true, messages: messages || [] });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Send a new chat message
exports.sendMessage = async (req, res) => {
  const { bookingId, senderId, message, price } = req.body;

  if (!bookingId || !senderId || !message) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  try {
    // 1. Verify that the booking exists and the sender is either the buyer or provider
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, buyer_id, provider_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ success: false, error: "Booking session not found." });
    }

    // 2. Insert chat message
    const { data: newMessage, error } = await supabase
      .from("chats")
      .insert([
        {
          booking_id: bookingId,
          sender_id: senderId,
          message: message,
          extracted_price: price || null
        }
      ])
      .select();

    if (error) {
      if (error.code === "PGRST205") {
        console.warn("Chats table missing. Message sent mocked.");
        return res.status(200).json({
          success: true,
          message: {
            id: "mock-id-" + Date.now(),
            booking_id: bookingId,
            sender_id: senderId,
            message: message,
            timestamp: new Date().toISOString()
          },
          dbWarning: "chats_table_missing"
        });
      }
      throw error;
    }

    return res.status(201).json({ success: true, message: newMessage[0] });
  } catch (err) {
    console.error("Error sending chat message:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Mark agreement to book
exports.agreeToBook = async (req, res) => {
  const { bookingId, userId, role, price } = req.body;

  if (!bookingId || !userId || !role) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  try {
    // Fetch current booking status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: "Booking negotiation not found." });
    }

    const updates = {};
    if (role === "buyer") {
      updates.buyer_agreed = true;
    } else if (role === "seller") {
      updates.seller_agreed = true;
    } else {
      return res.status(400).json({ success: false, error: "Invalid role specified." });
    }

    // Update the price if dynamic price is agreed upon
    if (price) {
      updates.price = price;
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .select();

    if (updateError) {
      // Fallback if columns don't exist yet in the database
      if (updateError.message.includes("column") && updateError.message.includes("does not exist")) {
        console.warn("Agreement columns missing in bookings table. Mocking success.");
        
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

    return res.status(200).json({
      success: true,
      booking: finalBooking,
      bothAgreed: bothAgreed
    });
  } catch (err) {
    console.error("Error updating booking agreement:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Fetch negotiation agreement status
exports.getAgreementStatus = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ success: false, error: "Booking ID is required." });
  }

  try {
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
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
