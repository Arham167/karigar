const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  try {
    console.log("--- DICTIONARY OF MOCK SELLER PHONE NUMBERS ---");
    const phones = [
      "+923124859302", // Asif Electrical Services
      "+923337164925", // K.K. Rewinding & Repair
      "+923004826173", // Madina Electric Store
      "+923459201847", // Smart Wiring Solutions
      "+923158392014", // Raza Electrical Engineering
      "+923217402918", // Instant Power Fix
      "+923349182736", // Volt Masters Karachi
      "+923018472910", // Al-Makkah Pipe Fitting & Sanitary
      "+923229481037", // Johar Boring & Sanitary Works
      "+923357193048", // Iqbal Sanitary Store
      "+923110293847", // Aziz & Brothers Plumbing
      "+923468201943"  // Lyari Plumbing Service
    ];

    for (const phone of phones) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .or(`phone_number.eq.${phone},phone_number.eq.${phone.replace("+", "")}`);

      if (pErr) {
        console.error(`Error querying profile for ${phone}:`, pErr.message);
        continue;
      }

      if (profiles && profiles.length > 0) {
        console.log(`\nPhone: ${phone} matched ${profiles.length} profiles:`);
        for (const p of profiles) {
          console.log(`  - Profile ID: ${p.id}, Name: ${p.name}, Role: ${p.role}`);
          
          // Check providers
          const { data: providers, error: provErr } = await supabase
            .from("providers")
            .select("*")
            .eq("user_id", p.id);

          if (provErr) {
            console.error(`    Error querying provider:`, provErr.message);
          } else if (providers && providers.length > 0) {
            providers.forEach(pr => {
              console.log(`    - Provider ID: ${pr.id}, BizName: ${pr.business_name}, Specialization: ${pr.specialization}`);
            });
          } else {
            console.log(`    - NO PROVIDER FOUND with user_id = ${p.id}`);
          }
        }
      } else {
        console.log(`Phone: ${phone} -> NO PROFILE FOUND`);
      }
    }
  } catch (err) {
    console.error("Exception during diagnosis:", err);
  }
}

diagnose();
