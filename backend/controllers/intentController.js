const nlpParser = require("../utils/nlpParser");

/**
 * POST /api/intent/parse
 * Body: { text: "plumber needed in gulshan today at 5pm" }
 * Returns service, time, location JSON objects with confidence scores
 */
exports.parseIntent = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Request text is required."
      });
    }

    const parsedData = await nlpParser.parseRequest(text);

    // Give back exactly three JSON objects as requested: service, time, location
    // Format:
    // {
    //   "service": { "value": "Plumber", "confidence": 0.95 } or null,
    //   "time": { "value": "5 PM", "confidence": 0.98 } or null,
    //   "location": { "value": "Gulshan", "confidence": 0.97 } or null
    // }
    return res.status(200).json({
      success: true,
      service: parsedData.service,
      time: parsedData.time,
      location: parsedData.location
    });
  } catch (error) {
    console.error("Error in parseIntent:", error);
    next(error);
  }
};

/**
 * POST /api/intent/clarify
 * Handle intent clarification if needed
 */
exports.clarifyIntent = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Intent clarified successfully."
    });
  } catch (error) {
    next(error);
  }
};
