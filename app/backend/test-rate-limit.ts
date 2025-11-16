/**
 * Rate Limit Testing Script
 * This script tests the rate limiting functionality
 */

import http from 'http';

interface RateLimitTest {
  name: string;
  endpoint: string;
  requests: number;
  expectedLimitAfter: number;
}

const tests: RateLimitTest[] = [
  {
    name: 'Global Rate Limit (100 per 15 minutes)',
    endpoint: '/api/v1/user',
    requests: 101,
    expectedLimitAfter: 100,
  },
  {
    name: 'Auth Rate Limit (5 per 15 minutes)',
    endpoint: '/api/v1/auth/login',
    requests: 6,
    expectedLimitAfter: 5,
  },
];

function makeRequest(
  method: string,
  path: string,
  hostname: string,
  port: number
): Promise<{
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers as Record<string, string | string[]>,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  const hostname = 'localhost';
  const port = 3001;

  console.log('Starting Rate Limit Tests\n');
  console.log(`Server: ${hostname}:${port}\n`);

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log(`Endpoint: ${test.endpoint}`);
    console.log(`Total Requests: ${test.requests}`);

    let blockedAt = -1;
    const results = {
      successCount: 0,
      blockedCount: 0,
      statusCodes: {} as Record<number, number>,
    };

    for (let i = 1; i <= test.requests; i++) {
      try {
        const response = await makeRequest('GET', test.endpoint, hostname, port);
        const statusCode = response.statusCode;

        results.statusCodes[statusCode] = (results.statusCodes[statusCode] || 0) + 1;

        if (statusCode === 429) {
          if (blockedAt === -1) {
            blockedAt = i;
          }
          results.blockedCount++;
        } else if (statusCode < 400) {
          results.successCount++;
        }

        // Small delay between requests to avoid overwhelming
        if (i % 10 === 0) {
          console.log(`  ${i}/${test.requests} requests sent...`);
        }
      } catch (error) {
        console.error(`  Error on request ${i}:`, error);
      }
    }

    console.log('\nResults:');
    console.log(`  Successful: ${results.successCount}`);
    console.log(`  Blocked (429): ${results.blockedCount}`);
    console.log(`  Blocked at request: ${blockedAt}`);
    console.log(`  Status Code Distribution:`, results.statusCodes);
    console.log(
      `  Expected blocking after: ${test.expectedLimitAfter} requests`
    );
    console.log(
      `  Test Passed: ${
        blockedAt > 0 && blockedAt <= test.expectedLimitAfter + 1 ? 'YES' : 'NO'
      }\n`
    );
  }
}

// Run tests
runTests().catch(console.error);
