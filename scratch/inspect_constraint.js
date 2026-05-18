const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const envPath = path.join(__dirname, "..", "backend", ".env");
require("dotenv").config({ path: envPath });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspect() {
  try {
    // Attempt to update a dummy value or check what constraints exist via system table query
    console.log("Checking bookings constraint details...");
    
    // We can run a query to fetch pg_constraint details via supabase.rpc or a direct query
    // Since direct SQL query might not be supported via the client directly without RPC,
    // let's try to update a test booking to 'confirmed' and catch the exact constraint name and error details.
    // Let's find a booking ID first
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status")
      .limit(1);
      
    if (fetchError) {
      console.error("Error fetching booking:", fetchError);
      return;
    }
    
    if (bookings.length === 0) {
      console.log("No bookings found in DB.");
      return;
    }
    
    const testId = bookings[0].id;
    const originalStatus = bookings[0].status;
    console.log(`Testing with booking ID: ${testId}, current status: ${originalStatus}`);
    
    // Try updating status to different values and see which ones succeed/fail
    const testStatuses = ["pending", "confirmed", "completed", "booked", "active"];
    for (const status of testStatuses) {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", testId)
        .select();
        
      if (error) {
        console.log(`❌ Status '${status}': FAILED - ${error.message}`);
      } else {
        console.log(`✅ Status '${status}': SUCCESS`);
        // Restore original status
        await supabase.from("bookings").update({ status: originalStatus }).eq("id", testId);
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

inspect();
