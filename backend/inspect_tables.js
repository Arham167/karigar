const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable(tableName) {
  const { data, error } = await supabase.from(tableName).select("*").limit(1);
  if (error) {
    console.error(`Error querying ${tableName}:`, error);
  } else {
    console.log(`${tableName} columns:`, data.length > 0 ? Object.keys(data[0]) : "No rows (let's try to query structure or select null)");
    
    // Attempt to query structure by selecting some likely column names
    if (data.length === 0) {
      const candidates = {
        profiles: ["id", "name", "phone", "role", "cnic", "created_at", "user_id"],
        providers: ["id", "user_id", "business_name", "location", "lat", "lng", "base_rating", "specialization"]
      }[tableName];
      
      if (candidates) {
        console.log(`Checking candidate columns for empty table ${tableName}:`);
        for (const col of candidates) {
          const { error: colErr } = await supabase.from(tableName).select(col).limit(1);
          console.log(`  - ${col}: ${colErr ? "MISSING" : "EXISTS"}`);
        }
      }
    }
  }
}

async function run() {
  await inspectTable("profiles");
  await inspectTable("providers");
}

run();
