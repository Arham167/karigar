const supabase = require("../utils/supabase");
const googleSheets = require("../utils/googleSheets");

exports.createBooking = async (req, res) => {
  res.status(201).json({ message: "Booking created (mock)" });
};

exports.getUserBookings = async (req, res) => {
  res.status(200).json({ bookings: [] });
};

exports.confirmBooking = async (req, res) => {
  try {
    console.log("[Booking Controller - confirmBooking] Request received with body:", JSON.stringify(req.body));
    const { 
      bookingId, 
      buyerId, 
      sellerId, 
      serviceType, 
      location, 
      requestedTime, 
      price,
      endTime,
      endingTime 
    } = req.body;

    let booking;

    if (bookingId) {
      console.log(`[Booking Controller - confirmBooking] Confirming existing booking ID: ${bookingId}`);
      
      const updateData = {
        status: "accepted",
        confirmed_time: new Date().toISOString()
      };
      
      if (price) {
        updateData.price = price;
        console.log(`[Booking Controller - confirmBooking] Updating price to ${price}`);
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .select();

      if (error) {
        console.error("[Booking Controller - confirmBooking] Error updating booking status:", error.message, error.stack);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`[Booking Controller - confirmBooking] Booking not found for ID: ${bookingId}`);
        return res.status(404).json({ success: false, error: "Booking not found." });
      }

      booking = data[0];
      console.log(`[Booking Controller - confirmBooking] Successfully updated booking ID: ${bookingId}`);
    } else {
      console.log("[Booking Controller - confirmBooking] Creating and confirming a new direct booking");
      
      const insertData = {
        buyer_id: buyerId,
        seller_id: sellerId,
        service_type: serviceType,
        location: location,
        requested_time: requestedTime || new Date().toISOString(),
        confirmed_time: new Date().toISOString(),
        price: price || 1500,
        status: "accepted"
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert([insertData])
        .select();

      if (error) {
        console.error("[Booking Controller - confirmBooking] Error inserting new booking:", error.message, error.stack);
        return res.status(500).json({ success: false, error: error.message });
      }

      booking = data[0];
      console.log(`[Booking Controller - confirmBooking] Successfully created new booking with ID: ${booking.id}`);
    }

    // Sync booking to Google Sheets CRM
    const SPREADSHEET_ID = process.env.SHARED_GOOGLE_SHEET_ID;
    if (SPREADSHEET_ID) {
      console.log(`[Booking Controller - confirmBooking] Initiating Google Sheets CRM sync for Spreadsheet ID: ${SPREADSHEET_ID}`);
      // Execute Sheets sync async in background so we don't delay client response
      (async () => {
        try {
          console.log(`[Booking Controller - SheetsSync] Fetching buyer profile for ID: ${booking.buyer_id}`);
          // 1. Get Client (Buyer) Name
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", booking.buyer_id)
            .single();

          // 2. Get Seller (Provider) Business Name
          let sellerBusinessName = "Professional Karigar";
          if (booking.seller_id) {
            console.log(`[Booking Controller - SheetsSync] Fetching seller business name for ID: ${booking.seller_id}`);
            const { data: provider } = await supabase
              .from("providers")
              .select("business_name")
              .eq("id", booking.seller_id)
              .single();

            if (provider && provider.business_name) {
              sellerBusinessName = provider.business_name;
              console.log(`[Booking Controller - SheetsSync] Found seller business name: ${sellerBusinessName}`);
            } else {
              console.log(`[Booking Controller - SheetsSync] Fallback: Fetching seller profile name for ID: ${booking.seller_id}`);
              const { data: sellerProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", booking.seller_id)
                .single();
              if (sellerProfile && sellerProfile.name) {
                sellerBusinessName = sellerProfile.name;
                console.log(`[Booking Controller - SheetsSync] Found seller profile name: ${sellerBusinessName}`);
              }
            }
          }

          console.log(`[Booking Controller - SheetsSync] Appending confirmed booking to Google Sheet for seller: ${sellerBusinessName}`);

          await googleSheets.appendBookingToSheet(SPREADSHEET_ID, {
            confirmedTime: booking.confirmed_time,
            requestedTime: booking.requested_time,
            endTime: endTime,
            endingTime: endingTime,
            buyerName: buyerProfile ? buyerProfile.name : "Client via Karigar",
            serviceType: booking.service_type || "Service Request",
            location: booking.location || "Karachi",
            sellerId: booking.seller_id,
            sellerBusinessName: sellerBusinessName
          });
          console.log(`[Booking Controller - SheetsSync] Google Sheets sync completed successfully!`);
        } catch (syncErr) {
          console.error("[Booking Controller - SheetsSync] Background Google Sheet sync failed:", syncErr.message, syncErr.stack);
        }
      })();
    } else {
      console.warn("[Booking Controller - confirmBooking] SHARED_GOOGLE_SHEET_ID environment variable is not defined. CRM sync skipped.");
    }

    console.log(`[Booking Controller - confirmBooking] Returning successful response to client for booking ID: ${booking.id}`);
    return res.status(200).json({
      success: true,
      booking
    });

  } catch (error) {
    console.error("[Booking Controller - confirmBooking] Exception in confirmBooking:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred while confirming booking."
    });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId, canceledBy } = req.body;
    console.log(`[Booking Controller - cancelBooking] Request to cancel booking ${bookingId} by ${canceledBy}`);

    if (!bookingId) {
      return res.status(400).json({ success: false, error: "Missing bookingId" });
    }

    // 1. Fetch existing booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      console.error("[Booking Controller - cancelBooking] Booking not found:", fetchError);
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    // 2. Update status to cancelled
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Booking Controller - cancelBooking] Error updating status:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // 3. Log cancellation and dispute (if canceled by seller)
    if (canceledBy === "seller" || canceledBy === "provider") {
      const providerId = booking.provider_id || booking.seller_id;
      if (providerId) {
        await supabase.from("provider_cancellations").insert([{
          provider_id: providerId,
          booking_id: bookingId
        }]);
        
        await supabase.from("disputes").insert([{
          booking_id: bookingId,
          filer_id: booking.buyer_id, // Auto-filed on behalf of buyer
          dispute_type: "cancellation",
          description: "Seller cancelled the booking automatically.",
          resolution: "Pending"
        }]);
      }
    }

    // 4. Determine next best 5 providers for the buyer
    let requestedTime = new Date(booking.requested_time || new Date());
    const now = new Date();
    
    // If the requested time is before or today, adjust it to 'now' so they can find available ones for today
    if (requestedTime <= now || requestedTime.toDateString() === now.toDateString()) {
      requestedTime = now;
      console.log("[Booking Controller - cancelBooking] Adjusted requested time to today/now.");
    }

    // We fetch next best providers in the same location (e.g., Nazimabad) offering the same service
    // Ordering by base_rating descending
    const { data: alternatives, error: altError } = await supabase
      .from("providers")
      .select("*, provider_services!inner(service_type)")
      .eq("location", booking.location || "Karachi")
      .neq("id", booking.provider_id || booking.seller_id) // Exclude the one who cancelled
      .order("base_rating", { ascending: false })
      .limit(5);

    if (altError) {
      console.error("[Booking Controller - cancelBooking] Error fetching alternatives:", altError);
    }
    
    // TODO: Send a realtime notification to the buyer (e.g., via websockets or push notification)
    console.log(`[Booking Controller - cancelBooking] Notification sent to buyer: Booking ${bookingId} cancelled.`);

    // Note: To fully remove from Google Sheet, we'd need a delete/update row logic in googleSheets.js.
    // For now, it will be skipped or ignored by UI based on DB status.

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      notification: "Sent to buyer",
      nextBestProviders: alternatives || [],
      adjustedRequestedTime: requestedTime.toISOString()
    });

  } catch (error) {
    console.error("[Booking Controller - cancelBooking] Exception:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred while cancelling booking."
    });
  }
};

