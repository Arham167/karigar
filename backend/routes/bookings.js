const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

// Confirm and sync booking to Google Sheets
router.post("/confirm", bookingController.confirmBooking);

// Cancel a booking and handle dispute / find alternatives
router.post("/cancel", bookingController.cancelBooking);

module.exports = router;
