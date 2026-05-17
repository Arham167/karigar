const express = require("express");
const router = express.Router();
const intentController = require("../controllers/intentController");

// POST /api/intent/parse
router.post("/parse", intentController.parseIntent);

// POST /api/intent/clarify
router.post("/clarify", intentController.clarifyIntent);

module.exports = router;
