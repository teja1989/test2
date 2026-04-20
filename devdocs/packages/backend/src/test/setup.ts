// Set required env vars before any module imports config.ts
process.env['AZURE_SEARCH_ENDPOINT'] = 'https://test.search.windows.net';
process.env['AZURE_SEARCH_KEY'] = 'test-admin-key-not-real';
process.env['AZURE_SEARCH_INDEX_NAME'] = 'test-index';
process.env['NODE_ENV'] = 'test';
