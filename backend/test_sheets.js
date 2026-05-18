// backend/test_sheets.js
const googleSheets = require("./utils/googleSheets");
require("dotenv").config();

// REPLACE WITH AN ACTUAL SPREADSHEET ID FOR TESTING
const TEST_SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

async function test() {
  console.log("1. Testing Google Sheets Calendar Fetch...");
  try {
    const calendar = await googleSheets.fetchSellerCalendar(TEST_SPREADSHEET_ID);
    console.log("✅ Success! Fetched rows:", calendar);
  } catch (err) {
    console.error("❌ Fetch Failed:", err.message);
  }

  console.log("\n2. Testing Sync Booking to Google Sheets...");
  try {
    const response = await googleSheets.appendBookingToSheet(TEST_SPREADSHEET_ID, {
      confirmedTime: new Date().toISOString(),
      buyerName: "Test Buyer",
      serviceType: "AC Maintenance Test"
    });
    console.log("✅ Success! Booking synced!");
  } catch (err) {
    console.error("❌ Sync Failed:", err.message);
  }
}

test();
