const express = require("express");
const router = express.Router();
const disputeController = require("../controllers/disputeController");

// File a new dispute
router.post("/file", disputeController.fileDispute);

// Get status of a specific dispute
router.get("/:disputeId", disputeController.getDisputeStatus);

module.exports = router;
