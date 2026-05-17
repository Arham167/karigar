const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "backend", ".env");
require("dotenv").config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase.from("bookings").select("*").limit(1);
    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      console.log("Bookings columns:", data.length > 0 ? Object.keys(data[0]) : "No rows found to inspect");
    }

    const { data: chatData, error: chatError } = await supabase.from("chats").select("*").limit(1);
    if (chatError) {
      console.error("Error fetching chats:", chatError);
    } else {
      console.log("Chats columns:", chatData.length > 0 ? Object.keys(chatData[0]) : "No rows found to inspect");
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

check();
