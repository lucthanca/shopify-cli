import { outputContent, outputToken } from '@shopify/cli-kit/node/output';
import { diffLines } from 'diff';
import { fileExists, readFile, writeFile } from '@shopify/cli-kit/node/fs';
import { patchEnvFile } from '@shopify/cli-kit/node/dot-env';

export const updateEnvFile = async (envFilePath, content) => {
	if (await fileExists(envFilePath)) {
		const envFileContent = await readFile(envFilePath);
		const updatedEnvFileContent = patchEnvFile(envFileContent, content);
		await writeFile(envFilePath, updatedEnvFileContent);
		const diff = diffLines(envFileContent ?? '', updatedEnvFileContent);
		return outputContent `Cập nhật file ${outputToken.path(envFilePath)} với các thay đổi:

${outputToken.linesDiff(diff)}
  `;
	}

	const newEnvFileContent = patchEnvFile(null, content);
	await writeFile(envFilePath, newEnvFileContent);
	return outputContent `Đã tạo file ${outputToken.path(envFilePath)}:

${newEnvFileContent}
`;
};