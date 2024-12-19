import { healthCheck } from '../verifier.js';
import { backendUrlPrompt } from './prompts.js';
import { renderError } from '@shopify/cli-kit/node/ui';

export const XPIFY_BACKEND_URL = 'XPIFY_BACKEND_URL';

export class BackendUrl {
  constructor(config) {
    this.config = config;
  }
  async input(forceBackendUrlPrompt = false) {
    const { localApp } = this.config;
    const { dotenv } = localApp;
    let i = process.env[XPIFY_BACKEND_URL] || dotenv.variables[XPIFY_BACKEND_URL];
    if (forceBackendUrlPrompt || !i) {
      i = await backendUrlPrompt();
    }
    try {
      await healthCheck(i);
    } catch (e) {
      if (e.message === 'x-graphql-timeout') {
        renderError({
          headline: "Không truy cập được URL.",
          body: [
            "Kiểm tra xem site có đang chạy không.",
          ],
        });
      }
      return await this.input(true);
    }
    return i;
  }
}
