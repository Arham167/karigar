const axios = require("axios");

// Regular Expression & Keyword Dictionaries for Multilingual Heuristics
// Covers English, Urdu, and Roman Urdu
const DICTIONARY = {
  services: [
    {
      id: "Plumber",
      keywords: [
        "plumber", "plumbing", "leak", "leakage", "tap", "pipe", "water", "sink", "toilet", "washroom", "flush",
        "nal saaz", "nalsaaz", "nalka", "toti", "toti leak", "paani ka masla", "panni", "tonti",
        "پلبر", "نل ساز", "نلکا", "ٹونٹی", "پائپ", "پانی کا مسئلہ", "لیک"
      ]
    },
    {
      id: "Electrician",
      keywords: [
        "electrician", "electricity", "wiring", "short circuit", "fan", "light", "switch", "board", "meter", "generator", "ups",
        "bijli", "bijli wala", "pankha", "pankhe", "dhaka", "button", "shart", "meter kharab",
        "الیکٹریشن", "بجلی", "پنکھا", "وائرنگ", "شارٹ سرکٹ", "میٹر"
      ]
    },
    {
      id: "AC Repair",
      keywords: [
        "ac", "air conditioner", "cooling", "split", "compressor", "gas refill", "gas leakage", "ac technician",
        "ac wala", "ac repair", "ac service", "thanda nahi", "ac kharab", "gas dalwani",
        "اے سی", "اے سی سروس", "اے سی خراب", "کولنگ", "کمپریسر"
      ]
    },
    {
      id: "Carpenter",
      keywords: [
        "carpenter", "woodwork", "door", "window", "table", "chair", "cabinet", "sofa", "furniture", "locksmith", "lock", "key",
        "lakri wala", "darwaza", "almari", "sofa repair", "wood work", "chabi", "tala",
        "کارپینٹر", "لکڑی", "دروازہ", "الماری", "فرنیچر", "تالا", "چابی"
      ]
    },
    {
      id: "Painter",
      keywords: [
        "painter", "paint", "painting", "wall paint", "distemper", "renovation",
        "rang wala", "rang karwana", "paint karwana", "deewar paint",
        "پینٹر", "رنگ ساز", "رنگ کروانا", "پینٹ"
      ]
    },
    {
      id: "Cleaner",
      keywords: [
        "cleaner", "cleaning", "maid", "sweeper", "washroom cleaning", "sofa cleaning", "deep cleaning", "dusting",
        "safai", "safai wala", "safai wali", "jharoo", "pocha", "dhona", "dhulayi", "kam wali",
        "صفائی", "ماسی", "کام والی", "جھاڑو", "پوچا"
      ]
    }
  ],
  times: [
    {
      id: "Immediate / Urgent",
      keywords: [
        "urgent", "immediately", "now", "asap", "right away",
        "abhi", "abhi chahiye", "fauran", "jaldi", "furi",
        "ابھی", "فوراً", "جلدی", "فوری"
      ]
    },
    {
      id: "Today",
      keywords: [
        "today", "this afternoon", "tonight",
        "aaj", "aaj dopahar", "aaj raat", "aaj sham",
        "آج", "آج شام", "آج رات"
      ]
    },
    {
      id: "Tomorrow",
      keywords: [
        "tomorrow", "tomorrow morning", "tomorrow evening",
        "kal", "kal subah", "kal sham", "kal dopahar",
        "کل", "کل صبح", "کل شام"
      ]
    },
    {
      id: "Morning",
      keywords: [
        "morning", "am",
        "subah", "saverey",
        "صبح", "سویرے"
      ]
    },
    {
      id: "Evening",
      keywords: [
        "evening", "pm",
        "shaam", "sham",
        "شام"
      ]
    }
  ],
  locations: [
    // Pre-seed some common Pakistani areas for heuristic lookup if HF fails
    "gulshan", "johar", "clifton", "defence", "dha", "nazimabad", "saddar", "khi", "lhr", "isb", "pindi",
    "gulshan-e-iqbal", "gulistan-e-johar", "bahria", "g-11", "g-13", "f-6", "h-13", "i-8", "gulberg", "cantt",
    "گلشن", "جوہر", "کلفٹن", "ڈیفنس", "صدر", "کراچی", "لاہور", "اسلام آباد"
  ]
};

// Hugging Face integration removed to optimize latency and eliminate 404 proxy routing issues.

// 2. Local Regex/Heuristics Multilingual Parser
function parseLocalHeuristics(text) {
  const cleanText = text.toLowerCase().trim();
  let serviceResult = null;
  let timeResult = null;
  let locationResult = null;

  // A. Extract Service
  for (const service of DICTIONARY.services) {
    for (const keyword of service.keywords) {
      // Word boundary matching to prevent partial matching (like "clean" inside "cleaning" is fine, but lets be precise)
      const escapedKeyword = keyword.replace(/[\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b|${escapedKeyword}`, "iu");
      if (regex.test(cleanText)) {
        serviceResult = {
          value: service.id,
          confidence: 0.95 // Direct keyword match is highly confident
        };
        break;
      }
    }
    if (serviceResult) break;
  }

  // B. Extract Time (Relative patterns and specific hours)
  // Check for specific time like 5 PM, 5 bajay, ۵ بجے
  const timeRegex = /(\b\d{1,2}\s*(?:pm|am|o'clock|bajay|baje|baja)\b|[\d۵۴۳۲۱۶۷۸۹۰]+\s*بجے)/iu;
  const timeMatch = cleanText.match(timeRegex);
  if (timeMatch) {
    timeResult = {
      value: timeMatch[0].trim(),
      confidence: 0.98
    };
  } else {
    // Check dictionary
    for (const time of DICTIONARY.times) {
      for (const keyword of time.keywords) {
        const escapedKeyword = keyword.replace(/[\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKeyword}\\b|${escapedKeyword}`, "iu");
        if (regex.test(cleanText)) {
          timeResult = {
            value: time.id,
            confidence: 0.85
          };
          break;
        }
      }
      if (timeResult) break;
    }
  }

  // C. Extract Location (supplementary dictionary lookup)
  for (const loc of DICTIONARY.locations) {
    const escapedLoc = loc.replace(/[\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedLoc}\\b|${escapedLoc}`, "iu");
    if (regex.test(cleanText)) {
      locationResult = {
        value: loc.charAt(0).toUpperCase() + loc.slice(1), // Capitalize
        confidence: 0.90
      };
      break;
    }
  }

  // If no dictionary location matches, look for "in [Word]", "at [Word]", "mein [Word]", "near [Word]"
  if (!locationResult) {
    const locPrepositions = /(?:in|at|near|mein|me|par|khasoosan|area|street|sector)\s+([a-zA-Z0-9\-\u0600-\u06FF]+)/iu;
    const prepMatch = cleanText.match(locPrepositions);
    if (prepMatch && prepMatch[1]) {
      const ignoredWords = ["need", "want", "help", "plumber", "electrician", "ac", "repair", "carpenter", "aaj", "kal", "sham", "subah", "baje", "bajay", "urgently", "urgent"];
      if (!ignoredWords.includes(prepMatch[1].toLowerCase())) {
        locationResult = {
          value: prepMatch[1].charAt(0).toUpperCase() + prepMatch[1].slice(1),
          confidence: 0.75
        };
      }
    }
  }

  return { serviceResult, timeResult, locationResult };
}


// Removed Vertex AI integration in favor of lightweight standard Google Gen AI SDK

// 4. Gemini LLM Multilingual Parser (Primary LLM if API Key is Present)

async function parseViaGemini(text, apiKey) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash which is lightning fast and free/low-cost
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
You are an expert multilingual entity extractor for a local home-services app named "Karigar".
Analyze the user's service request, which can be in English, Urdu, or Roman Urdu (Urdu written in English alphabets like "mujhe plumber chahiye").
Extract exactly 3 entities:
1. "service" (the type of service or technician requested, e.g., Plumber, Electrician, AC Repair, Carpenter, Painter, Cleaner, etc.)
2. "time" (when they need it, e.g., Today, Tomorrow, 5 PM, Immediately, Tomorrow Morning, etc.)
3. "location" (the city, area, sector, or neighborhood mentioned, e.g., Gulshan-e-Iqbal, G-13, Clifton, Lahore, etc.)

Your response MUST be strict JSON, with keys: "service", "time", "location".
Each key must be a JSON object with:
- "value": string (the parsed value normalized) or null if not found.
- "confidence": a float between 0.0 and 1.0 representing your confidence, or null if value is null.

Example Input: "mujhe kal subah gulshan mein ac repair k liye banda chahiye"
Example Output:
{
  "service": { "value": "AC Repair", "confidence": 0.98 },
  "time": { "value": "Tomorrow Morning", "confidence": 0.95 },
  "location": { "value": "Gulshan", "confidence": 0.95 }
}

Provide ONLY the raw JSON output block. Do not include any explanation or markdown formatting outside of the JSON.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Request: "${text}"` }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const contentText = result.response.text().trim();
    // Parse the JSON blocks
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Gemini Extraction failed. Falling back to local parser.", error);
  }
  return null;
}


// Helper to resolve human-readable time strings into standard ISO-8601 dates for DB storage
function resolveTimeToDate(timeStr) {
  if (!timeStr) return new Date().toISOString();
  
  const clean = timeStr.toLowerCase().trim();
  
  // Format current date in Karachi time zone to parts
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = type => parseInt(parts.find(p => p.type === type).value, 10);
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  const createKarachiDate = (y, m, d, h, min = 0, s = 0) => {
    return new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}+05:00`);
  };

  const currentKarachi = createKarachiDate(year, month, day, hour, minute, second);

  // 1. Immediate / Urgent / Abhi
  if (
    clean.includes("urgent") || 
    clean.includes("now") || 
    clean.includes("asap") || 
    clean.includes("immediately") || 
    clean.includes("abhi") ||
    clean.includes("fauran") ||
    clean.includes("jaldi")
  ) {
    return now.toISOString();
  }

  // Helper to extract tomorrow's date parts in Karachi
  const getTomorrowParts = () => {
    const tom = new Date(currentKarachi.getTime() + 24 * 60 * 60 * 1000);
    const tomParts = formatter.formatToParts(tom);
    const getTomPart = type => parseInt(tomParts.find(p => p.type === type).value, 10);
    return {
      y: getTomPart('year'),
      m: getTomPart('month'),
      d: getTomPart('day')
    };
  };

  // 2. Tomorrow / Kal
  if (clean.includes("tomorrow") || clean.includes("kal")) {
    const tom = getTomorrowParts();
    let targetHour = 12;
    if (clean.includes("morning") || clean.includes("subah")) {
      targetHour = 9;
    } else if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
      targetHour = 17;
    } else if (clean.includes("afternoon") || clean.includes("dopahar")) {
      targetHour = 13;
    }
    
    // Check if there's a specific hour in the query too, e.g., "tomorrow 5 PM"
    const matchHour = clean.match(/(\d+)/);
    if (matchHour) {
      let parsedHour = parseInt(matchHour[1], 10);
      if (clean.includes("pm") && parsedHour < 12) {
        parsedHour += 12;
      } else if (clean.includes("am") && parsedHour === 12) {
        parsedHour = 0;
      } else if (clean.includes("sham") || clean.includes("shaam") || clean.includes("evening")) {
        if (parsedHour < 12) parsedHour += 12;
      }
      targetHour = parsedHour;
    }
    
    return createKarachiDate(tom.y, tom.m, tom.d, targetHour, 0, 0).toISOString();
  }

  // 3. Today / Aaj
  if (clean.includes("today") || clean.includes("aaj")) {
    let targetHour = hour;
    if (clean.includes("morning") || clean.includes("subah")) {
      targetHour = 9;
    } else if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
      targetHour = 17;
    } else if (clean.includes("afternoon") || clean.includes("dopahar")) {
      targetHour = 13;
    }
    
    // Check if there's a specific hour, e.g., "today 5 PM"
    const matchHour = clean.match(/(\d+)/);
    if (matchHour) {
      let parsedHour = parseInt(matchHour[1], 10);
      if (clean.includes("pm") && parsedHour < 12) {
        parsedHour += 12;
      } else if (clean.includes("am") && parsedHour === 12) {
        parsedHour = 0;
      } else if (clean.includes("sham") || clean.includes("shaam") || clean.includes("evening")) {
        if (parsedHour < 12) parsedHour += 12;
      }
      targetHour = parsedHour;
    }
    
    return createKarachiDate(year, month, day, targetHour, 0, 0).toISOString();
  }

  // 4. Specific hours like "5 pm", "5 baje", "10 baje"
  const matchHour = clean.match(/(\d+)/);
  if (matchHour) {
    let targetHour = parseInt(matchHour[1], 10);
    if (clean.includes("pm") && targetHour < 12) {
      targetHour += 12;
    } else if (clean.includes("am") && targetHour === 12) {
      targetHour = 0;
    } else if (clean.includes("sham") || clean.includes("shaam") || clean.includes("evening")) {
      if (targetHour < 12) targetHour += 12;
    }
    
    let resolvedDate = createKarachiDate(year, month, day, targetHour, 0, 0);
    // If that hour already passed today in Karachi, schedule it for tomorrow
    if (resolvedDate.getTime() < currentKarachi.getTime()) {
      const tom = getTomorrowParts();
      resolvedDate = createKarachiDate(tom.y, tom.m, tom.d, targetHour, 0, 0);
    }
    return resolvedDate.toISOString();
  }

  // 5. Morning / Subah fallback
  if (clean.includes("morning") || clean.includes("subah")) {
    let resolvedDate = createKarachiDate(year, month, day, 9, 0, 0);
    if (resolvedDate.getTime() < currentKarachi.getTime()) {
      const tom = getTomorrowParts();
      resolvedDate = createKarachiDate(tom.y, tom.m, tom.d, 9, 0, 0);
    }
    return resolvedDate.toISOString();
  }

  // 6. Evening / Sham fallback
  if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
    let resolvedDate = createKarachiDate(year, month, day, 17, 0, 0);
    if (resolvedDate.getTime() < currentKarachi.getTime()) {
      const tom = getTomorrowParts();
      resolvedDate = createKarachiDate(tom.y, tom.m, tom.d, 17, 0, 0);
    }
    return resolvedDate.toISOString();
  }

  return now.toISOString();
}

// MAIN EXPOSED METHOD
exports.parseRequest = async (text) => {
  if (!text || typeof text !== "string") {
    return {
      service: null,
      time: null,
      location: null
    };
  }

  console.log(`[NLP Engine] Parsing request: "${text}"`);

  // Step A: Run local Heuristics first (Fast & Free Primary Engine - 0ms latency)
  const heuristics = parseLocalHeuristics(text);

  const heuristicLocation = heuristics.locationResult;
  const heuristicService = heuristics.serviceResult;
  const heuristicTime = heuristics.timeResult;

  // Resolve timestamp for heuristic time if present
  if (heuristicTime && heuristicTime.value) {
    heuristicTime.resolvedTimestamp = resolveTimeToDate(heuristicTime.value);
  }

  // Check if we successfully extracted ALL 3 required details (Service, Time, Location)
  const hasService = heuristicService && heuristicService.value;
  const hasTime = heuristicTime && heuristicTime.value;
  const hasLocation = heuristicLocation && heuristicLocation.value;

  if (hasService && hasTime && hasLocation) {
    const result = {
      service: heuristicService,
      time: heuristicTime,
      location: heuristicLocation
    };
    console.log("[NLP Engine] Successfully parsed via Heuristics (Primary):", JSON.stringify(result));
    return result;
  }

  console.log("[NLP Engine] Heuristics incomplete. Falling back to Gemini LLM for deep extraction...");

  // Step B: Fallback to Standard Gemini LLM (Intelligent Semantic Extraction)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_key" && geminiKey !== "") {
    console.log("[NLP Engine] Attempting extraction via standard Google Gemini API (Fallback)");
    const geminiResult = await parseViaGemini(text, geminiKey);
    if (geminiResult) {
      if (geminiResult.time && geminiResult.time.value) {
        geminiResult.time.resolvedTimestamp = resolveTimeToDate(geminiResult.time.value);
      }
      console.log("[NLP Engine] Successfully parsed via Gemini (Fallback):", JSON.stringify(geminiResult));
      return geminiResult;
    }
  }

  // Step C: Ultimate Fallback (Return whatever Heuristics found, even if incomplete)
  const finalResult = {
    service: heuristicService,
    time: heuristicTime,
    location: heuristicLocation
  };
  console.log("[NLP Engine] Gemini failed or not configured. Returning incomplete Heuristics:", JSON.stringify(finalResult));
  return finalResult;
};

// 5. Price Extraction via Gemini
exports.extractPrice = async (text) => {
  if (!text || typeof text !== "string") return null;
  
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "your_gemini_key") {
    console.warn("[NLP Price Extractor] Gemini API key missing. Cannot extract price.");
    return null;
  }

  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
You are an expert price extractor. Analyze the user's chat message and extract any agreed or proposed price in Pakistani Rupees (PKR/Rs).
If the user is proposing, agreeing, or mentioning a specific amount for the service, return that number.
If there are multiple numbers, return the final agreed or proposed price.
Return ONLY a valid JSON object with the format: {"price": <number>}
If no clear price is discussed, return {"price": null}
Example 1: "1500 kar lein" -> {"price": 1500}
Example 2: "nahi 2000 honge" -> {"price": 2000}
Example 3: "ok done" -> {"price": null}
Do not return any markdown or text outside of the JSON block.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nMessage: "${text}"` }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const contentText = result.response.text().trim();
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.price || null;
    }
  } catch (error) {
    console.error("[NLP Price Extractor] Error extracting price:", error.message);
  }
  return null;
};
