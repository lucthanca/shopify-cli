import { CLI_KIT_VERSION } from '@shopify/cli-kit/common/version';
import { fetch } from '@shopify/cli-kit/node/http';

function restRequestBody(requestBody) {
  if (!requestBody) {
    return;
  }
  return JSON.stringify(requestBody);
}

const buildHeaders = () => {
  const userAgent = `Shopify CLI; v=${CLI_KIT_VERSION}`;
  return {
    'User-Agent': userAgent,
    'Keep-Alive': 'timeout=30',
    // 'Sec-CH-UA': secCHUA, This header requires the Git sha.
    'Sec-CH-UA-PLATFORM': process.platform,
    'Content-Type': 'application/json',
  };
};
async function restRequest(url, { method = 'GET', requestBody }) {
  const body = restRequestBody(requestBody);
  const headers = buildHeaders();
  const response = await fetch(url, {
    headers,
    method,
    body,
  });
  const json = await response.json().catch(() => ({}));
  return {
    json,
    status: response.status,
    headers: response.headers.raw(),
  };
}

export default restRequest;
