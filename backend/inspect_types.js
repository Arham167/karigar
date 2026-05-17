const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspectTypes() {
  try {
    const { data: bData, error: bErr } = await supabase.from("bookings").select("id, buyer_id").limit(1);
    if (bErr) {
      console.error("Bookings query error:", bErr);
    } else if (bData && bData.length > 0) {
      console.log("Bookings.id sample:", bData[0].id, "Type of id:", typeof bData[0].id);
      console.log("Bookings.buyer_id sample:", bData[0].buyer_id, "Type of buyer_id:", typeof bData[0].buyer_id);
    } else {
      console.log("No bookings rows found. Let's try to query profiles.");
    }

    const { data: pData, error: pErr } = await supabase.from("profiles").select("id").limit(1);
    if (pErr) {
      console.error("Profiles query error:", pErr);
    } else if (pData && pData.length > 0) {
      console.log("Profiles.id sample:", pData[0].id, "Type of id:", typeof pData[0].id);
    } else {
      console.log("No profiles rows found.");
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

inspectTypes();
