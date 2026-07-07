#!/usr/bin/env node

/**
 * Test OpenRA-RL HTTP Endpoints
 * Validates the running service responds to our expected API
 */

const BASE_URL = "http://localhost:8000";

async function testEndpoint(name, method, path, body = null) {
  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`\n📡 Testing: ${method} ${path}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✓ ${name}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Response (first 200 chars): ${JSON.stringify(data).substring(0, 200)}...`);
      return { success: true, status: response.status, data };
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Error: ${data.detail || data.message || JSON.stringify(data)}`);
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🎮 OpenRA-RL HTTP Endpoint Test");
  console.log("═════════════════════════════════════════════════════");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("═════════════════════════════════════════════════════");

  const results = [];

  // Test 1: Health check
  results.push(await testEndpoint("Health Check", "GET", "/health"));

  // Test 2: Status endpoint
  results.push(await testEndpoint("Server Status", "GET", "/status"));

  // Test 3: Observation (GET /observation)
  results.push(await testEndpoint("Get Observation", "GET", "/observation"));

  // Test 4: Schema endpoint
  results.push(await testEndpoint("Get Schema", "GET", "/schema"));

  // Test 5: Step command (POST /step)
  const testCommand = {
    commands: [
      {
        action: "no_op",
      },
    ],
  };
  results.push(await testEndpoint("Execute Step (no-op)", "POST", "/step", testCommand));

  // Summary
  console.log("\n═════════════════════════════════════════════════════");
  console.log("📊 Summary");
  console.log("═════════════════════════════════════════════════════");

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All endpoints responding correctly");
    process.exit(0);
  } else {
    console.log("✗ Some endpoints failed");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
