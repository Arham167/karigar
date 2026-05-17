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

// 1. Hugging Face Named Entity Recognition for Location
async function extractLocationViaHF(text, apiKey = null) {
  try {
    const url = "https://api-inference.huggingface.co/models/Davlan/xlm-roberta-base-wikiann-ner";
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    
    // We set a moderate timeout so the application does not hang
    const response = await axios.post(
      url, 
      { inputs: text }, 
      { headers, timeout: 6000 }
    );

    if (Array.isArray(response.data)) {
      // WikiANN entities: LOC, PER, ORG
      // We look specifically for "LOC" (Location)
      const locEntities = response.data.filter(
        (ent) => ent.entity_group === "LOC" || ent.entity === "B-LOC" || ent.entity === "I-LOC"
      );

      if (locEntities.length > 0) {
        // Reassemble sub-words/tokens if model split them
        // xlm-roberta uses "_" or "##" or similar sub-word tokens
        let locationName = "";
        let totalScore = 0;
        
        locEntities.forEach((ent) => {
          let word = ent.word || "";
          // Clean standard sentencepiece / roberta token prefixes
          word = word.replace(/^[▄_ ]+/, "").trim();
          if (word) {
            locationName += (locationName ? " " : "") + word;
            totalScore += ent.score || 0.90;
          }
        });

        if (locationName.trim()) {
          return {
            value: locationName.trim(),
            confidence: Math.round((totalScore / locEntities.length) * 100) / 100
          };
        }
      }
    }
  } catch (error) {
    console.warn("Hugging Face API call failed or timed out. Falling back to local parser.", error.message);
  }
  return null;
}

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


// 5. Vertex AI Gemini Multilingual Parser (Enterprise GCP - Charged to Project Credits)
async function parseViaVertexAI(text) {
  try {
    const { VertexAI } = require("@google-cloud/vertexai");

    // Initialize Vertex AI
    // Automatically uses process.env.GOOGLE_APPLICATION_CREDENTIALS or gcloud CLI credentials
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || "us-central1";

    const vertexAI = new VertexAI({ 
      project: projectId, 
      location: location 
    });

    const model = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

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

    const request = {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Request: "${text}"` }] }],
    };

    const response = await model.generateContent(request);
    
    // Safety check to ensure we get candidate responses back
    if (response && response.response && response.response.candidates && response.response.candidates[0]) {
      const responseText = response.response.candidates[0].content.parts[0].text.trim();
      
      // Parse the JSON blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error("Vertex AI Gemini Extraction failed. Falling back to next parser in pipeline.", error);
  }
  return null;
}

// 4. Gemini LLM Multilingual Parser (Primary LLM if API Key is Present)

async function parseViaGemini(text, apiKey) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is lightning fast and free/low-cost
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
  const now = new Date();

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

  // 2. Tomorrow / Kal
  if (clean.includes("tomorrow") || clean.includes("kal")) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (clean.includes("morning") || clean.includes("subah")) {
      tomorrow.setHours(9, 0, 0, 0);
    } else if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
      tomorrow.setHours(17, 0, 0, 0);
    } else if (clean.includes("afternoon") || clean.includes("dopahar")) {
      tomorrow.setHours(13, 0, 0, 0);
    } else {
      tomorrow.setHours(12, 0, 0, 0);
    }
    return tomorrow.toISOString();
  }

  // 3. Today / Aaj
  if (clean.includes("today") || clean.includes("aaj")) {
    if (clean.includes("morning") || clean.includes("subah")) {
      now.setHours(9, 0, 0, 0);
    } else if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
      now.setHours(17, 0, 0, 0);
    } else if (clean.includes("afternoon") || clean.includes("dopahar")) {
      now.setHours(13, 0, 0, 0);
    }
    return now.toISOString();
  }

  // 4. Specific hours like "5 pm", "5 baje", "10 baje"
  const matchHour = clean.match(/(\d+)/);
  if (matchHour) {
    let hour = parseInt(matchHour[1], 10);
    if (clean.includes("pm") && hour < 12) {
      hour += 12;
    } else if (clean.includes("am") && hour === 12) {
      hour = 0;
    } else if (clean.includes("sham") || clean.includes("shaam") || clean.includes("evening")) {
      if (hour < 12) hour += 12; // 5 baje sham -> 17:00
    }
    now.setHours(hour, 0, 0, 0);
    // If that hour already passed today, schedule it for tomorrow
    if (now.getTime() < Date.now()) {
      now.setDate(now.getDate() + 1);
    }
    return now.toISOString();
  }

  // 5. Morning / Subah fallback
  if (clean.includes("morning") || clean.includes("subah")) {
    now.setHours(9, 0, 0, 0);
    if (now.getTime() < Date.now()) now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  // 6. Evening / Sham fallback
  if (clean.includes("evening") || clean.includes("sham") || clean.includes("shaam")) {
    now.setHours(17, 0, 0, 0);
    if (now.getTime() < Date.now()) now.setDate(now.getDate() + 1);
    return now.toISOString();
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

  // Step A: If Vertex AI is configured, run Vertex AI (Preferred GCP hackathon credits route)
  const gcpProjectId = process.env.GCP_PROJECT_ID;
  if (gcpProjectId && gcpProjectId !== "your_gcp_project_id" && gcpProjectId !== "") {
    console.log(`[NLP Engine] Attempting extraction via GCP Vertex AI (Project: ${gcpProjectId})`);
    const vertexResult = await parseViaVertexAI(text);
    if (vertexResult) {
      // Resolve timestamp for Vertex AI results if present
      if (vertexResult.time && vertexResult.time.value) {
        vertexResult.time.resolvedTimestamp = resolveTimeToDate(vertexResult.time.value);
      }
      console.log("[NLP Engine] Successfully parsed via Vertex AI Gemini:", JSON.stringify(vertexResult));
      return vertexResult;
    }
  }

  // Step B: If standard Gemini key is available, run standard Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_key" && geminiKey !== "") {
    const geminiResult = await parseViaGemini(text, geminiKey);
    if (geminiResult) {
      // Resolve timestamp for Gemini results if present
      if (geminiResult.time && geminiResult.time.value) {
        geminiResult.time.resolvedTimestamp = resolveTimeToDate(geminiResult.time.value);
      }
      console.log("[NLP Engine] Successfully parsed via Gemini:", JSON.stringify(geminiResult));
      return geminiResult;
    }
  }

  // Step B: Run Hugging Face Model for Location extraction
  const hfKey = process.env.HF_API_KEY;
  const hfLocation = await extractLocationViaHF(text, hfKey);

  // Step C: Run Heuristic Rules for Service, Time, and Location (Fallback)
  const heuristics = parseLocalHeuristics(text);

  // Step D: Synthesize & Merge Results
  // We prefer Hugging Face location if it found one, otherwise heuristic location
  const finalLocation = hfLocation || heuristics.locationResult;
  const finalService = heuristics.serviceResult;
  const finalTime = heuristics.timeResult;

  if (finalTime && finalTime.value) {
    finalTime.resolvedTimestamp = resolveTimeToDate(finalTime.value);
  }

  const result = {
    service: finalService,
    time: finalTime,
    location: finalLocation
  };

  console.log("[NLP Engine] Parsed via HF/Heuristics:", JSON.stringify(result));
  return result;
};
