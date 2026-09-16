// Runs once before any test/worker starts. Authenticates the Evinced SDK using
// credentials pulled from the environment (see .env.example / repo secrets in CI)
// so no secret ever lives in a source-controlled file.
const { setCredentials } = require('@evinced/js-playwright-sdk');

async function globalSetup() {
  const serviceId = process.env.EVINCED_SERVICE_ID;
  const secret = process.env.EVINCED_API_KEY;

  if (!serviceId || !secret) {
    throw new Error(
      'Missing EVINCED_SERVICE_ID / EVINCED_API_KEY env vars. Locally: copy .env.example ' +
        'to .env, fill in the values Evinced gave you, and export them before running the ' +
        'suite. In CI: set the EVINCED_SERVICE_ID / EVINCED_API_KEY repo secrets.'
    );
  }

  try {
    await setCredentials({ serviceId, secret });
  } catch (error) {
    throw new Error(`Evinced SDK authorization failure: ${error.message}`);
  }
}

module.exports = globalSetup;
