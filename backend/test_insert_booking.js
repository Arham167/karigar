const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testInsert() {
  try {
    // 1. Get a buyer user ID from profiles
    const { data: buyers, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "buyer")
      .limit(1);

    if (pErr) {
      console.error("Error fetching buyer profile:", pErr);
      return;
    }

    if (buyers.length === 0) {
      console.error("No buyers in database to test with!");
      return;
    }

    const buyerId = buyers[0].id;

    // 2. Real provider ID for "Aziz & Brothers Plumbing"
    const providerId = "7d9b0f50-e3f7-4720-9769-59a61b2f0cae";

    console.log(`Attempting to query booking for buyer=${buyerId} and provider=${providerId}:`);
    const { data: fetchBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("seller_id", providerId)
      .eq("status", "pending")
      .limit(1);

    if (fetchErr) {
      console.error("Fetch booking failed:", fetchErr);
    } else {
      console.log("Fetch booking success:", fetchBooking);
    }

    console.log(`\nAttempting to insert booking:`);
    const { data: insertBooking, error: insertErr } = await supabase
      .from("bookings")
      .insert([
        {
          buyer_id: buyerId,
          seller_id: providerId,
          service_type: "Plumber",
          location: "Karachi",
          requested_time: new Date().toISOString(),
          price: 1200,
          status: "pending"
        }
      ])
      .select();

    if (insertErr) {
      console.error("Insert booking failed:", insertErr);
    } else {
      console.log("Insert booking success:", insertBooking);
      
      // Clean it up
      if (insertBooking && insertBooking.length > 0) {
        console.log("Deleting test booking...");
        const { error: delErr } = await supabase.from("bookings").delete().eq("id", insertBooking[0].id);
        if (delErr) console.error("Clean up failed:", delErr);
        else console.log("Clean up success!");
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

testInsert();
