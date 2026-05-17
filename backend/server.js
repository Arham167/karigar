const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Load .env.local if it exists, otherwise fall back to .env
const envPath = fs.existsSync(path.join(__dirname, ".env.local"))
  ? path.join(__dirname, ".env.local")
  : path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });

// Securely handle GCP Service Account Key at runtime on Vercel without committing secrets to git
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  try {
    const tempKeyPath = path.join("/tmp", "gcp-key.json");
    if (!fs.existsSync("/tmp")) {
      fs.mkdirSync("/tmp");
    }
    fs.writeFileSync(tempKeyPath, process.env.GCP_SERVICE_ACCOUNT_KEY);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
    console.log("[GCP Config] Successfully wrote service account key to /tmp/gcp-key.json");
  } catch (err) {
    console.error("[GCP Config] Failed to write GCP credentials to temp file:", err);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/providers", require("./routes/providers"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/disputes", require("./routes/disputes"));
app.use("/api/intent", require("./routes/intent"));
app.use("/api/antigravity", require("./routes/antigravity"));

app.use(require("./middleware/errorHandler"));

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
