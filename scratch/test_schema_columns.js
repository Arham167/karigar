const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const envPath = path.join(__dirname, "..", "backend", ".env");
require("dotenv").config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testColumn(tableName, columnName) {
  const { data, error } = await supabase.from(tableName).select(columnName).limit(1);
  if (error) {
    return { exists: false, error: error.message, code: error.code };
  }
  return { exists: true };
}

async function run() {
  console.log("Checking columns on 'bookings' table:");
  
  const cols = ["provider_id", "seller_id", "buyer_agreed", "seller_agreed", "buyer_id", "price", "status"];
  for (const col of cols) {
    const res = await testColumn("bookings", col);
    if (res.exists) {
      console.log(`  - ${col}: EXISTS`);
    } else {
      console.log(`  - ${col}: MISSING (Error: ${res.error})`);
    }
  }

  console.log("\nChecking if tables exist:");
  const tables = ["users", "providers", "provider_services", "provider_reviews", "bookings", "chats", "disputes", "profiles"];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error && error.code === "PGRST205") {
      console.log(`  - ${table}: DOES NOT EXIST`);
    } else if (error) {
      console.log(`  - ${table}: EXISTS (returned error ${error.code}: ${error.message})`);
    } else {
      console.log(`  - ${table}: EXISTS`);
    }
  }
}

run();
