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
    
    // Log the entire parsed data for Vercel backend logs as requested
    console.log("[Intent Parsed Data]:", JSON.stringify(parsedData, null, 2));

    // Give back exactly JSON objects as requested: service, time, location, and optionally budget_sensitivity and time_sensitivity
    return res.status(200).json({
      success: true,
      service: parsedData.service,
      time: parsedData.time,
      location: parsedData.location,
      budget_sensitivity: parsedData.budget_sensitivity || null,
      time_sensitivity: parsedData.time_sensitivity || null
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
