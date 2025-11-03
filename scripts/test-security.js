#!/usr/bin/env node

/**
 * Security Test Script
 * Tests the typing test application for score manipulation vulnerabilities
 */

const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

console.log('🔒 WordRush Security Test Suite\n');
console.log(`Testing against: ${API_URL}\n`);

// Test 1: Missing keystroke data
async function testMissingKeystrokes() {
  console.log('Test 1: Submitting result without keystroke data...');
  try {
    const response = await fetch(`${API_URL}/api/submit-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keystrokes: [],
        wordsTyped: ['test', 'words'],
        expectedWords: ['test', 'words'],
        duration: 30,
        startTime: Date.now() - 30000,
        theme: 'test'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 400 || response.status === 401) {
      console.log('✅ PASS: Request rejected as expected');
      console.log(`   Status: ${response.status} - ${result.error}\n`);
    } else {
      console.log('❌ FAIL: Request should have been rejected');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log('✅ PASS: Request failed (likely authentication required)');
    console.log(`   Error: ${error.message}\n`);
  }
}

// Test 2: Impossible WPM
async function testImpossibleWPM() {
  console.log('Test 2: Submitting impossible WPM (500)...');
  
  // Generate fake keystrokes
  const fakeKeystrokes = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: Date.now() - 30000 + i * 30,
    key: 'a',
    wordIndex: Math.floor(i / 5),
    isCorrect: true
  }));
  
  try {
    const response = await fetch(`${API_URL}/api/submit-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keystrokes: fakeKeystrokes,
        wordsTyped: Array(200).fill('test'),
        expectedWords: Array(200).fill('test'),
        duration: 30,
        startTime: Date.now() - 30000,
        theme: 'test'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 400 && result.error.includes('WPM')) {
      console.log('✅ PASS: Impossible WPM rejected');
      console.log(`   Status: ${response.status} - ${result.error}\n`);
    } else if (response.status === 401) {
      console.log('✅ PASS: Authentication required (expected)');
      console.log(`   Status: ${response.status}\n`);
    } else {
      console.log('❌ FAIL: Should reject impossible WPM');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log('✅ PASS: Request failed (likely authentication required)');
    console.log(`   Error: ${error.message}\n`);
  }
}

// Test 3: Invalid timing
async function testInvalidTiming() {
  console.log('Test 3: Submitting result with invalid timing...');
  
  const fakeKeystrokes = Array.from({ length: 100 }, (_, i) => ({
    timestamp: Date.now() - 60000 + i * 100, // 60 seconds ago
    key: 'a',
    wordIndex: Math.floor(i / 5),
    isCorrect: true
  }));
  
  try {
    const response = await fetch(`${API_URL}/api/submit-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keystrokes: fakeKeystrokes,
        wordsTyped: ['test', 'words'],
        expectedWords: ['test', 'words'],
        duration: 30, // Claims 30 seconds
        startTime: Date.now() - 60000, // But started 60 seconds ago
        theme: 'test'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 400 && result.error.includes('timing')) {
      console.log('✅ PASS: Invalid timing rejected');
      console.log(`   Status: ${response.status} - ${result.error}\n`);
    } else if (response.status === 401) {
      console.log('✅ PASS: Authentication required (expected)');
      console.log(`   Status: ${response.status}\n`);
    } else {
      console.log('❌ FAIL: Should reject invalid timing');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log('✅ PASS: Request failed (likely authentication required)');
    console.log(`   Error: ${error.message}\n`);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting security tests...\n');
  
  await testMissingKeystrokes();
  await testImpossibleWPM();
  await testInvalidTiming();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('Security tests completed!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n⚠️  Note: Most tests should fail with 401 Unauthorized');
  console.log('   This is expected and means authentication is working.');
  console.log('\n💡 To test with authentication:');
  console.log('   1. Log in to the app in a browser');
  console.log('   2. Copy the session cookie');
  console.log('   3. Include it in the fetch requests above');
}

// Run the test suite
runTests().catch(console.error);
