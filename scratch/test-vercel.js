const testQueries = [
  "plumber in gulshan",
  "I need an expert AC specialist to service my split unit because it's not cooling properly.",
  "some random text",
  "Urgent electrician needed at Johar baje",
];

async function runTests() {
  for (const query of testQueries) {
    console.log(`\nTesting query: "${query}"`);
    try {
      const response = await fetch('https://karigar-arham-nomans-projects.vercel.app/api/intent/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      console.log(`Status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }
}

runTests();
