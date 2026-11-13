const { spawnSync } = require('node:child_process');
const path = require('node:path');
const url =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/ecom_upgrade_test';
if (!new URL(url).pathname.endsWith('_test'))
  throw new Error(
    'TEST_DATABASE_URL phải trỏ tới database có tên kết thúc bằng _test',
  );
const env = {
  ...process.env,
  DATABASE_URL: url,
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'integration-access-only',
  JWT_REFRESH_SECRET: 'integration-refresh-only',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  MOMO_PARTNER_CODE: 'TEST_PARTNER',
  MOMO_ACCESS_KEY: 'integration-access',
  MOMO_SECRET_KEY: 'integration-secret',
  MOMO_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
};
for (const [cli, args] of [
  ['prisma/build/index.js', ['generate']],
  ['prisma/build/index.js', ['migrate', 'deploy']],
  ['jest/bin/jest.js', ['--config', './test/jest-e2e.json', '--runInBand']],
]) {
  const result = spawnSync(
    process.execPath,
    [path.join('node_modules', cli), ...args],
    { stdio: 'inherit', env },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
