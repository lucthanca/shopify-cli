import { renderTextPrompt } from '@shopify/cli-kit/node/ui';

export const backendUrlPrompt = async () => {
  return renderTextPrompt({
    message: `Điền XPIFY_BACKEND_URL:`,
    defaultValue: '',
  });
};