require('dotenv').config({ path: '.env.local' });
const nlp = require('./utils/nlpParser');

const testText = "mujhe kal subah gulshan mein ac repair k liye banda chahiye";
console.log(`[NLP Test] Parsing test sentence: "${testText}"\n`);

nlp.parseRequest(testText)
  .then(result => {
    console.log("\n=================================");
    console.log("🎉 SUCCESS! Live Vertex AI Response:");
    console.log("=================================");
    console.log(JSON.stringify(result, null, 2));
    console.log("=================================");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n=================================");
    console.error("❌ FAILED! Error details:");
    console.error("=================================");
    console.error(err);
    console.log("=================================");
    process.exit(1);
  });
