import { graphqlRequest } from '@shopify/cli-kit/node/api/graphql';
import { gql } from 'graphql-request';
import { XPIFY_BACKEND_URL } from './backendEndpoint/backendUrlInput.js';

const LIGHT_APP_QUERY = gql `
    query App($appName: String!) {
        app (field: name, value: $appName) {
            id
        }
    }
`;

const LIGHT_CHECK_QUERY = gql `
    query HealthCheck {
        __typename
    }
`;

export async function verifyToken(token, appName) {
    const url = new URL('/graphql', process.env[XPIFY_BACKEND_URL]).href;

    try {
        return await graphqlRequest({
            query: LIGHT_APP_QUERY,
            api: 'XpifyApp',
            url,
            token,
            variables: {
                appName,
            },
            addedHeaders: {
                timeout: 5000,
                'x-auth-required': '0',
            },
        });
    } catch (error) {
        if (error.constructor.name === 'GraphQLClientError') {

            const isCannotQueryFieldAppError = error.errors?.[0]?.message.includes('Cannot query field "app" on type "Query"');
            if (error.errors?.[0]?.extensions?.category === 'graphql-authorization' || isCannotQueryFieldAppError) {
                throw new Error('x-graphql-authorization');
            }

        }
        if (error.code === 'ETIMEDOUT') {
            throw new Error('x-graphql-timeout');
        }
    }
}

export async function healthCheck(url)
{
    const endpoint = new URL('/graphql', url).href;
    try {
        return await graphqlRequest({
            query: LIGHT_CHECK_QUERY,
            api: 'XpifyHealthCheck',
            url: endpoint,
            token: undefined,
            variables: {},
            addedHeaders: {
                timeout: 5000,
                'x-auth-required': '0',
            },
        });
    } catch (error) {
        if (error.code === 'ETIMEDOUT') {
            throw new Error('x-graphql-timeout');
        }
    }
}