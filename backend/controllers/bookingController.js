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
      console.log(`[Booking Controller] Confirming existing booking ID: ${bookingId}`);
      
      const updateData = {
        status: "accepted",
        confirmed_time: new Date().toISOString()
      };
      
      if (price) {
        updateData.price = price;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .select();

      if (error) {
        console.error("[Booking Controller] Error updating booking status:", error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, error: "Booking not found." });
      }

      booking = data[0];
    } else {
      console.log("[Booking Controller] Creating and confirming a new direct booking");
      
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
        console.error("[Booking Controller] Error inserting booking:", error);
        return res.status(500).json({ success: false, error: error.message });
      }

      booking = data[0];
    }

    // Sync booking to Google Sheets CRM
    const SPREADSHEET_ID = process.env.SHARED_GOOGLE_SHEET_ID;
    if (SPREADSHEET_ID) {
      // Execute Sheets sync async in background so we don't delay client response
      (async () => {
        try {
          // 1. Get Client (Buyer) Name
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", booking.buyer_id)
            .single();

          // 2. Get Seller (Provider) Business Name
          let sellerBusinessName = "Professional Karigar";
          if (booking.seller_id) {
            const { data: provider } = await supabase
              .from("providers")
              .select("business_name")
              .eq("id", booking.seller_id)
              .single();

            if (provider && provider.business_name) {
              sellerBusinessName = provider.business_name;
            } else {
              const { data: sellerProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", booking.seller_id)
                .single();
              if (sellerProfile && sellerProfile.name) {
                sellerBusinessName = sellerProfile.name;
              }
            }
          }

          console.log(`[Booking Controller] Syncing confirmed booking to Google Sheet for seller: ${sellerBusinessName}`);

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
        } catch (syncErr) {
          console.error("[Booking Controller] Background Google Sheet sync failed:", syncErr.message);
        }
      })();
    } else {
      console.warn("[Booking Controller] SHARED_GOOGLE_SHEET_ID environment variable is not defined. CRM sync skipped.");
    }

    return res.status(200).json({
      success: true,
      booking
    });

  } catch (error) {
    console.error("[Booking Controller] Exception in confirmBooking:", error);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred while confirming booking."
    });
  }
};
