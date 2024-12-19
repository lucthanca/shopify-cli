import { gql } from 'graphql-request';
import { graphqlRequest } from '@shopify/cli-kit/node/api/graphql';
import { renderTasks } from '@shopify/cli-kit/node/ui';
import { XPIFY_BACKEND_URL } from './backendEndpoint/backendUrlInput.js';
import { XPIFY_SECRET_KEY } from './backendAuth/secretKeyInput.js';

const APP_QUERY = gql `
    query GetApp($remoteId: String!) {
        app (field: remote_id, value: $remoteId) {
            id name api_key secret_key scopes api_version token
        }
    }
`;
const CREATE_APP_MUTATION = gql `
    mutation CreateApp($input: SaveAppInput!) {
        saveApp(input: $input) {
            id token
        }
    }
`;

export async function ensureXpifyApp (config) {
	let app;
	try {
		await renderTasks([
			{
				title: 'Lấy thông tin App từ backend...',
				task: async () => {
					app = await getApp(config);
				},
			},
			{
				title: 'Đồng bộ thông tin App...',
				task: async () => {
					if (app) {
						const apiSecret = getApiScecret(config.remoteApp);
						const remoteAppHandle = config.remoteApp?.configuration?.handle ?? resolveAppHandleFromName(config.remoteApp.title);
						const changes = {
							api_key: app.api_key !== config.remoteApp.apiKey ? config.remoteApp.apiKey : undefined,
							secret_key: app.secret_key !== apiSecret ? apiSecret : undefined,
							scopes: app.scopes !== config.localApp.configuration?.['access_scopes']?.scopes ? config.localApp.configuration?.['access_scopes']?.scopes : undefined,
							name: app.name !== config.remoteApp.title ? config.remoteApp.title : undefined,
							api_version: app.api_version !== config.localApp.configuration?.['webhooks']?.['api_version'] ? config.localApp.configuration?.['webhooks']?.['api_version'] : undefined,
							handle: app.handle !== remoteAppHandle ? remoteAppHandle : undefined,
						};

						const filteredChanges = Object.fromEntries(Object.entries(changes).filter(([_, v]) => v !== undefined));

						if (Object.keys(filteredChanges).length > 0) {
							await saveApp({ id: app.id, ...filteredChanges }, 'XpifyUpdateApp');
						}
					}
				},
			}
		]);
	} catch (e) {
		if (e.message !== 'x-graphql-no-such-entity')
			throw e;
		await renderTasks([{
			title: 'Tạo App mới...',
			task: async () => {
				app = await createApp(config);
			},
		}]);
	}
	if (!app?.id) {
		throw new Error('Không tạo được app vào backend, check lại!')
	}
	process.env.XPIFY_APP_ID = app.id;
	process.env.XPIFY_APP_REMOTE_ID = config.remoteApp.id;
	process.env.XPIFY_APP_TOKEN = app.token;
}

const createApp = async (config) => {
	const { remoteApp, localApp } = config;
	const result = await saveApp({
		name: remoteApp.title,
		api_key: remoteApp.apiKey,
		secret_key: getApiScecret(remoteApp),
		remote_id: remoteApp.id,
		scopes: localApp.configuration?.['access_scopes']?.scopes || null,
		api_version: config.localApp.configuration?.['webhooks']?.['api_version'] || '2024-01',
		handle: remoteApp.configuration?.handle ?? resolveAppHandleFromName(remoteApp.title),
	}, 'XpifyCreateApp');
	if (!result.saveApp?.id) {
		throw new Error('Không tạo được app vào backend, check lại!')
	}
	return result.saveApp;
};

const resolveAppHandleFromName = (name) => {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const saveApp = async (input, apiName) => {
	try {
		return await graphqlRequest({
			query: CREATE_APP_MUTATION,
			api: apiName,
			url: getBackendEndpoint(),
			token: process.env[XPIFY_SECRET_KEY],
			variables: {
				input,
			},
			addedHeaders: {
				'x-auth-required': '0',
			},
		});
	} catch (e) {
		if (e.constructor.name === 'GraphQLClientError') {
			if (e.errors?.[0]?.extensions?.category === 'graphql-authorization') {
				throw new Error('Token không hợp lệ, thử lại.');
			}
			if (e.errors?.[0]?.extensions?.category === 'x-duplicate-handle') {
				throw new Error(`Trùng app handle - đã tồn tại 1 app có handle ${input.handle ?? 'N/A'}. Đổi tên app hoặc thêm handle vào file toml.`);
			}
			if (e.errors?.[0]?.extensions?.category === 'x-duplicate-remoteId') throw new Error(`Trùng remote id. lỗi này thì debug đi.`);
		}
	}
}

const getApp = async (config) => {
	try {
		const result = await graphqlRequest({
			query: APP_QUERY,
			api: 'XpifyApp',
			url: getBackendEndpoint(),
			token: process.env[XPIFY_SECRET_KEY],
			variables: {
				remoteId: config.remoteApp.id,
			},
			addedHeaders: {
				'x-auth-required': '0',
			},
		});
		if (result?.app?.id) {
			return result.app;
		}
		throw new Error('x-graphql-no-such-entity');
	} catch (error) {
		if (error.constructor.name === 'GraphQLClientError') {
			if (error.errors?.[0]?.extensions?.category === 'graphql-authorization') {
				throw new Error('Token không hợp lệ, thử lại.');
			}
			if (error.errors?.[0]?.extensions?.category === 'graphql-no-such-entity') {
				throw new Error('x-graphql-no-such-entity');
			}
		}
		throw error;
	}
};

function getBackendEndpoint() {
	return new URL('/graphql', process.env[XPIFY_BACKEND_URL]).href;
}

function getApiScecret(app) {
	const apiSecret = app.apiSecret ? app.apiSecret : (app.apiSecretKeys.length === 0 ? undefined : app.apiSecretKeys[0].secret);
	if (!apiSecret) {
		throw new Error('Không tìm thấy secret key của app, debug lại!');
	}
	return apiSecret;
}