import { renderTextPrompt, renderSelectPrompt } from '@shopify/cli-kit/node/ui';

const VERIFY_TYPE = {
  TOKEN: 'token',
  ADMIN_PASSWORD: 'admin-password',
};

export const renderTokenPrompt = async () => {
  return await renderTextPrompt({
    message: `Điền admin API token để fetch config của app:`,
    defaultValue: '',
  });
};

export async function verifyTypePrompt() {
  return await renderSelectPrompt({
    message: 'Chọn cách để xác thực với Backend:',
    choices: [
      { label: 'Dùng tài khoản admin', value: VERIFY_TYPE.ADMIN_PASSWORD },
      { label: 'Dùng admin token', value: VERIFY_TYPE.TOKEN },
    ],
  });
}

/**
 * Show prompt to input admin username and password
 *
 * @returns {Promise<[string, string]>}
 */
export async function adminUserPasswordPrompt() {
  const username = await renderTextPrompt({
    message: `Nhập tài khoản Admin:`,
    defaultValue: '',
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return "Nhập tài khoản Admin đi cha.";
      }
    }
  });
  const password = await renderTextPrompt({
    message: `Nhập mật khẩu Admin:`,
    defaultValue: '',
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return "Không ai để mật khẩu trống cả.";
      }
    },
    password: true,
  });
  return [username, password];
}


export { VERIFY_TYPE as PROMPT_VERIFY_TYPE };
