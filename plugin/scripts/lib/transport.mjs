import { getValidToken } from './auth.mjs';

export async function sendReport(serverUrl, report, configOrApiKey) {
  const headers = { 'Content-Type': 'application/json' };

  // Resolve auth token: supports both new config object and legacy apiKey string
  let token;
  if (typeof configOrApiKey === 'object' && configOrApiKey !== null) {
    try {
      token = await getValidToken(configOrApiKey);
    } catch (err) {
      if (err.message.includes('expired')) {
        throw new Error('인증이 만료되었습니다. 다시 인증해 주세요: node authenticate.mjs');
      }
      throw err;
    }
  } else if (typeof configOrApiKey === 'string') {
    // Legacy: plain apiKey string
    token = configOrApiKey;
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${serverUrl}/api/usage`, {
    method: 'POST',
    headers,
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
  }
}
