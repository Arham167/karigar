# Implementation Plan: Google Sheets CRM Integration (For Antigravity Orchestrator)

This document is a step-by-step, code-complete implementation plan designed to be executed by *Antigravity. It details how to connect Google Sheets as a two-way CRM for sellers (providers) in the **Karigar* application, enabling real-time availability calculations and automated booking synchronization.

---

## Technical Architecture Overview
1. *Service Account Key*: Already configured and present at [gcp-key.json](file:///d:/Desktop/Safqore/Projects/karigar/backend/gcp-key.json).
2. *Database Integration*: Link providers in Supabase via google_sheet_id and use_sheets_crm columns.
3. *Availability Checking*: In matchingController.js, fetch the sheet calendar using the Google Sheets API if the provider has configured a sheet. Filter out overlapping slots during the 2-hour requested window.
4. *Booking Syncing*: Update the sheet when a booking is confirmed (either in chatController.js on mutual negotiation agreement or in bookingController.js).

---

## Phase 1: Supabase Database Migration

Execute the following migration to support linking providers with Google Sheets:

sql
-- Step 1: Add sheet linkage fields to the providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT;

ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS use_sheets_crm BOOLEAN DEFAULT FALSE;


---

## Phase 2: Backend Dependencies

Install the official Google APIs library inside the backend folder:
bash
cd backend
npm install googleapis


---

## Phase 3: Create Google Sheets Utility File

Create a new utility helper file at [googleSheets.js](file:///d:/Desktop/Safqore/Projects/karigar/backend/utils/googleSheets.js). 

This utility handles Google API authorization using the existing [gcp-key.json](file:///d:/Desktop/Safqore/Projects/karigar/backend/gcp-key.json) file, fetches calendar rows, parses multiple date/time formats, and appends confirmed bookings to a sheet.

javascript
// backend/utils/googleSheets.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Resolve keyfile path, supporting dynamic /tmp injection on Vercel
let keyFile = path.join(__dirname, '../gcp-key.json');
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

// Initialize Google Auth using your service account credentials
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Robust helper to parse different date/time formats from the spreadsheet into a standard JS Date object.
 * Handles formats like: "15:00", "03:00 PM", "3 PM" and dates like "2026-05-18"
 */
function parseSheetDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  
  const cleanTime = timeStr.trim();
  let hours = 0;
  let minutes = 0;

  // Try matching 12-hour AM/PM format (e.g., "03:30 PM", "3 PM")
  const ampmMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const ampm = ampmMatch[3].toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
  } else {
    // Try matching 24-hour format (e.g., "15:30")
    const standardMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (standardMatch) {
      hours = parseInt(standardMatch[1], 10);
      minutes = parseInt(standardMatch[2], 10);
    }
  }

  try {
    const formattedDate = new Date(`${dateStr.trim()}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
    return isNaN(formattedDate.getTime()) ? null : formattedDate;
  } catch (e) {
    console.error(`[Sheets Utility] Failed parsing date-time combining ${dateStr} & ${timeStr}:`, e);
    return null;
  }
}

/**
 * Fetch schedule rows from a seller's Google Sheet and parse them into standardized objects
 * @param {string} spreadsheetId 
 * @param {string} range (Default to 'Sheet1!A2:F100')
 */
async function fetchSellerCalendar(spreadsheetId, range = 'Sheet1!A2:F100') {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows
      .map((row, index) => {
        const dateStr = row[0];
        const startStr = row[1];
        const endStr = row[2];

        if (!dateStr || !startStr || !endStr) return null;

        const startTime = parseSheetDateTime(dateStr, startStr);
        const endTime = parseSheetDateTime(dateStr, endStr);

        if (!startTime || !endTime) return null;

        return {
          rowNumber: index + 2, // 1-indexed header offset
          startTime,
          endTime,
          clientName: row[3] || 'N/A',
          serviceType: row[4] || 'N/A',
          status: (row[5] || 'Booked').toLowerCase(), // e.g., "booked", "blocked", "available"
        };
      })
      .filter(item => item !== null);
  } catch (error) {
    console.error(`[Google Sheets Service] Error reading spreadsheet ${spreadsheetId}:`, error.message);
    throw error;
  }
}

/**
 * Appends a new booking row back to the seller's Google Sheet CRM
 * @param {string} spreadsheetId 
 * @param {Object} booking 
 */
async function appendBookingToSheet(spreadsheetId, booking) {
  try {
    const dateObj = new Date(booking.confirmedTime || booking.requestedTime || new Date());
    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Format times into HH:MM standard
    const startStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
    
    // Default 2-hour duration for the booking
    const endObj = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000);
    const endStr = endObj.toTimeString().split(' ')[0].substring(0, 5);

    const values = [
      [
        dateStr,
        startStr,
        endStr,
        booking.buyerName || 'Client via Karigar',
        booking.serviceType || 'Service Call',
        'Booked'
      ]
    ];
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log(`[Google Sheets Service] Synced booking for provider sheet ${spreadsheetId} successfully.`);
    return response.data;
  } catch (error) {
    console.error(`[Google Sheets Service] Error writing booking to spreadsheet ${spreadsheetId}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchSellerCalendar,
  appendBookingToSheet
};


---

## Phase 4: Connect to matchingController.js

In [matchingController.js](file:///d:/Desktop/Safqore/Projects/karigar/backend/controllers/matchingController.js), we need to check if the matched providers are available during the requested time. We will inject the Google Sheets real-time fetch inside the availability check loops.

### Replacement inside [matchingController.js](file:///d:/Desktop/Safqore/Projects/karigar/backend/controllers/matchingController.js):

Find the availability checking code block (*lines 164-198*):

javascript
      // 3. Check availability if a time is specified
      if (resolvedTimestamp && matchingProviders.length > 0) {
        const providerIds = matchingProviders.map(p => p.id);
        const reqTime = new Date(resolvedTimestamp);
        
        // Define a 2-hour window around the requested time
        const startTime = new Date(reqTime.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const endTime = new Date(reqTime.getTime() + 2 * 60 * 60 * 1000).toISOString();

        // Fetch booked slots that overlap with this window
        const { data: bookedSlots, error: slotError } = await supabase
          .from("booking_slots")
          .select("provider_id, start_time, end_time")
          .eq("status", "booked")
          .in("provider_id", providerIds)
          .or(`start_time.gte.${startTime},end_time.lte.${endTime}`);

        if (slotError) {
          console.error("[Matching Engine] Error fetching booking slots:", slotError);
        }

        const bookedProviderIds = new Set((bookedSlots || []).map(slot => slot.provider_id));

        // Mark providers as available or unavailable
        matchingProviders = matchingProviders.map(provider => ({
          ...provider,
          available: !bookedProviderIds.has(provider.id)
        }));
      } else {
...


*Replace it with this Google Sheet aware routine:*

javascript
      // 3. Check availability if a time is specified
      if (resolvedTimestamp && matchingProviders.length > 0) {
        const reqTime = new Date(resolvedTimestamp);
        
        // Define a 2-hour window around the requested time
        const startTimeWindow = new Date(reqTime.getTime() - 2 * 60 * 60 * 1000);
        const endTimeWindow = new Date(reqTime.getTime() + 2 * 60 * 60 * 1000);

        const googleSheets = require("../utils/googleSheets");

        const availabilityPromises = matchingProviders.map(async (provider) => {
          // --- PATH A: GOOGLE SHEETS CRM ---
          if (provider.use_sheets_crm && provider.google_sheet_id) {
            try {
              console.log(`[Matching Engine] Reading live calendar from Google Sheet for provider: ${provider.business_name}`);
              const sheetBookings = await googleSheets.fetchSellerCalendar(provider.google_sheet_id);
              
              // Overlap check: Slot starts before window ends, and ends after window starts
              const hasOverlap = sheetBookings.some(slot => {
                const isBusy = slot.status === 'booked' || slot.status === 'blocked';
                if (!isBusy) return false;
                return slot.startTime < endTimeWindow && slot.endTime > startTimeWindow;
              });

              return {
                ...provider,
                available: !hasOverlap
              };
            } catch (err) {
              console.error(`[Matching Engine] Google Sheet fetch failed for ${provider.business_name}, falling back to local DB:`, err.message);
            }
          }

          // --- PATH B: SUPABASE DB FALLBACK ---
          try {
            const { data: bookedSlots } = await supabase
              .from("booking_slots")
              .select("id")
              .eq("provider_id", provider.id)
              .eq("status", "booked")
              .or(`start_time.gte.${startTimeWindow.toISOString()},end_time.lte.${endTimeWindow.toISOString()}`);
            
            return {
              ...provider,
              available: !bookedSlots || bookedSlots.length === 0
            };
          } catch (slotError) {
            console.error(`[Matching Engine] Local slot fetching failed for provider ${provider.id}:`, slotError);
            return { ...provider, available: true }; // Optimistic fallback
          }
        });

        matchingProviders = await Promise.all(availabilityPromises);
      } else {
        // Assume available if no time is checked
        matchingProviders = matchingProviders.map(provider => ({
          ...provider,
          available: true
        }));
      }


---

## Phase 5: Integrate Booking Sync back to Google Sheet CRM

Since the chat system handles price negotiation and agreement, a booking is confirmed when both the buyer and the seller agree. We can trigger the Google Sheet update directly inside agreeToBook in [chatController.js](file:///d:/Desktop/Safqore/Projects/karigar/backend/controllers/chatController.js).

### In [chatController.js](file:///d:/Desktop/Safqore/Projects/karigar/backend/controllers/chatController.js):

Inject this at the top of the file:
javascript
const googleSheets = require("../utils/googleSheets");


Find the agreeToBook function (*around line 273*):

javascript
    const finalBooking = updatedBooking[0];
    const bothAgreed = finalBooking.buyer_agreed && finalBooking.seller_agreed;

    return res.status(200).json({
      success: true,
      booking: finalBooking,
      bothAgreed: bothAgreed
    });


*Modify it to look up the provider and sync to Google Sheets if they use it:*

javascript
    const finalBooking = updatedBooking[0];
    const bothAgreed = finalBooking.buyer_agreed && finalBooking.seller_agreed;

    // IF AGREEMENT IS SUCCESSFUL, SYNC BOOKING TO GOOGLE SHEETS
    if (bothAgreed) {
      // Run async in background so we don't block the API response
      (async () => {
        try {
          // Fetch provider profile and sheet configurations
          const { data: provider } = await supabase
            .from("providers")
            .select("google_sheet_id, use_sheets_crm, business_name")
            .eq("user_id", finalBooking.seller_id) // or provider_id depending on relations
            .single();

          if (provider && provider.use_sheets_crm && provider.google_sheet_id) {
            console.log(`[Chat Controller] Syncing confirmed booking to Google Sheet for ${provider.business_name}`);
            
            // Get buyer's name for client information
            const { data: buyerProfile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", finalBooking.buyer_id)
              .single();

            await googleSheets.appendBookingToSheet(provider.google_sheet_id, {
              confirmedTime: finalBooking.confirmed_time || new Date(),
              requestedTime: finalBooking.requested_time || new Date(),
              buyerName: buyerProfile ? buyerProfile.name : "Client via Karigar",
              serviceType: finalBooking.service_type || "Service Request"
            });
          }
        } catch (syncErr) {
          console.error("[Chat Controller] Background Google Sheet sync failed:", syncErr.message);
        }
      })();
    }

    return res.status(200).json({
      success: true,
      booking: finalBooking,
      bothAgreed: bothAgreed
    });


---

## Phase 6: Quick Local Test Verification Script

Create a temporary test script at backend/test_sheets.js to verify integration:

javascript
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


Run via terminal:
bash
node backend/test_sheets.js