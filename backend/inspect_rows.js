const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspectRows() {
  try {
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, name, role, phone_number");
    if (pErr) console.error("Profiles error:", pErr);
    else console.log(`Profiles in DB (${profiles.length}):`, profiles);

    const { data: providers, error: prErr } = await supabase.from("providers").select("id, user_id, business_name, specialization");
    if (prErr) console.error("Providers error:", prErr);
    else console.log(`Providers in DB (${providers.length}):`, providers);

    const { data: bookings, error: bErr } = await supabase.from("bookings").select("id, buyer_id, seller_id, status");
    if (bErr) console.error("Bookings error:", bErr);
    else console.log(`Bookings in DB (${bookings.length}):`, bookings);
  } catch (err) {
    console.error("Exception:", err);
  }
}

inspectRows();
