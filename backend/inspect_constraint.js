const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspect() {
  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status")
      .limit(1);
      
    const testId = bookings[0].id;
    const originalStatus = bookings[0].status;
    
    // Try updating status to different values and see which ones succeed/fail
    const testStatuses = [
      "pending", 
      "completed", 
      "cancelled", 
      "disputed", 
      "confirmed", 
      "accepted", 
      "approved",
      "success"
    ];
    
    console.log("Probing database check constraints for bookings.status...");
    for (const status of testStatuses) {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", testId)
        .select();
        
      if (error) {
        console.log(`❌ '${status}': FAILED - ${error.message}`);
      } else {
        console.log(`✅ '${status}': SUCCESS`);
        // Restore original status
        await supabase.from("bookings").update({ status: originalStatus }).eq("id", testId);
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

inspect();
