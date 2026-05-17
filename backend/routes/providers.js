const express = require("express");
const router = express.Router();
const matchingController = require("../controllers/matchingController");

// POST /api/providers/match
router.post("/match", matchingController.matchProviders);

module.exports = router;
