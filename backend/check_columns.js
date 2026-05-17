const supabase = require("./utils/supabase");

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
