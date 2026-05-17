const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// Fetch message history for a booking
router.get("/messages/:bookingId", chatController.getMessages);

// Send a new message
router.post("/message", chatController.sendMessage);

// Agree to booking at a specific price
router.post("/agree", chatController.agreeToBook);

// Get current agreement status and check if both parties have agreed
router.get("/agreement-status/:bookingId", chatController.getAgreementStatus);

module.exports = router;

