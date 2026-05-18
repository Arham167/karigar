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
    const formattedDate = new Date(`${dateStr.trim()}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:00`);
    return isNaN(formattedDate.getTime()) ? null : formattedDate;
  } catch (e) {
    console.error(`[Sheets Utility] Failed parsing date-time combining ${dateStr} & ${timeStr}:`, e);
    return null;
  }
}

/**
 * Fetch schedule rows from a seller's Google Sheet and parse them into standardized objects
 * @param {string} spreadsheetId 
 * @param {string} range (Default to 'Sheet1!A2:I100')
 * @param {string} sellerId (Optional: filter rows for this specific seller in shared sheet)
 * @param {string} sellerBusinessName (Optional: filter rows using business name for robust manual typing support)
 */
async function fetchSellerCalendar(spreadsheetId, range = 'Sheet1!A2:I100', sellerId = null, sellerBusinessName = null) {
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
          location: row[5] || 'Karachi',
          status: (row[6] || 'Booked').toLowerCase(), // e.g., "booked", "blocked", "available"
          sellerId: row[7] || null,
          sellerBusinessName: row[8] || null,
        };
      })
      .filter(item => {
        if (item === null) return false;
        
        // If a specific sellerId is requested, filter rows belonging to other sellers in robust way
        if (sellerId) {
          const cleanSellerId = String(sellerId).trim().toLowerCase();
          const cleanItemSellerId = item.sellerId ? String(item.sellerId).trim().toLowerCase() : '';
          const cleanItemBizName = item.sellerBusinessName ? String(item.sellerBusinessName).trim().toLowerCase() : '';
          const cleanBizName = sellerBusinessName ? String(sellerBusinessName).trim().toLowerCase() : '';

          // 1. Direct UUID match
          const uuidMatch = cleanItemSellerId === cleanSellerId;

          // 2. Business name matches the row's business name
          const bizNameMatch = cleanBizName && cleanItemBizName && (
            cleanItemBizName.includes(cleanBizName) || cleanBizName.includes(cleanItemBizName)
          );

          // 3. User typed business name in the sellerId column instead of UUID
          const idBizNameMatch = cleanBizName && cleanItemSellerId && (
            cleanItemSellerId.includes(cleanBizName) || cleanBizName.includes(cleanItemSellerId)
          );

          if (!uuidMatch && !bizNameMatch && !idBizNameMatch) {
            return false;
          }
        }
        return true;
      });
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
    
    // Format date in Karachi timezone (YYYY-MM-DD)
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
    
    const timeOptions = {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    // Format times into HH:MM standard in Karachi timezone
    const startStr = new Intl.DateTimeFormat('en-GB', timeOptions).format(dateObj);
    
    // Default 2-hour duration for the booking
    const endObj = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000);
    const endStr = new Intl.DateTimeFormat('en-GB', timeOptions).format(endObj);

    const values = [
      [
        dateStr,
        startStr,
        endStr,
        booking.buyerName || 'Client via Karigar',
        booking.serviceType || 'Service Call',
        booking.location || 'Karachi',
        'Booked',
        booking.sellerId || '',
        booking.sellerBusinessName || ''
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
