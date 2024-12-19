import { verifyToken } from '../verifier.js';
import { renderTokenPrompt, verifyTypePrompt, PROMPT_VERIFY_TYPE, adminUserPasswordPrompt } from './prompts.js';
import { renderError } from '@shopify/cli-kit/node/ui';
import rest from '../rest.js';
import { XPIFY_BACKEND_URL } from '../backendEndpoint/backendUrlInput.js';

export const XPIFY_SECRET_KEY = 'XPIFY_SECRET_KEY';

const resolveToken = async () => {
  const [username, password] = await adminUserPasswordPrompt();
  const url = `${process.env[XPIFY_BACKEND_URL]}/rest/V1/integration/admin/token`;
  const body = {
    username,
    password,
  };

  const { json, status } = await rest(url, { method: 'POST', requestBody: body });

  if (status === 401) {
    throw new Error('x-invalid-admin-credentials');
  }
  if (status !== 200) {
    throw new Error('x-server-error');
  }
  return json;
};

export class SecretKey {
  constructor(config) {
    this.config = config;
    this.verifyType = null;
  }

  async input(forceSecretPrompt = false) {
    const { remoteApp, localApp } = this.config;
    const { title } = remoteApp;
    let i = process.env[XPIFY_SECRET_KEY] || localApp.dotenv.variables[XPIFY_SECRET_KEY];
    if (forceSecretPrompt || !i) {
      if (!this.verifyType) {
        this.verifyType = await verifyTypePrompt();
      }
      switch (this.verifyType) {
        case PROMPT_VERIFY_TYPE.TOKEN:
          i = await renderTokenPrompt();
          break;
        case PROMPT_VERIFY_TYPE.ADMIN_PASSWORD:
          try {
            i = await resolveToken();
          } catch (e) {
            if (e.message === 'x-invalid-admin-credentials') {
              renderError({
                headline: 'Sai tên tài khoản hoặc mật khẩu.',
                body: ['Vui lòng kiểm tra lại thông tin đăng nhập.'],
              });
              return await this.input(true);
            }
            if (e.message === 'x-server-error') {
              throw new Error('Lỗi kết nối với Backend. Kiểm tra lại');
            }
          }
      }
    }
    try {
      await verifyToken(i, title);
    } catch (e) {
      if (e.message === 'x-graphql-authorization') {
        renderError({
          headline: 'Khoá bảo mật không hợp lệ hoặc đã hết hạn.',
          body: ['Vui lòng kiểm tra lại khoá bảo mật.'],
        });
        return await this.input(true);
      }
    }
    return i;
  }
}
