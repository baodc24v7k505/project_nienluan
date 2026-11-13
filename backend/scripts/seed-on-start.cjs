const { spawnSync } = require('node:child_process');
if (process.env.SEED_DEMO_DATA === 'false') process.exit(0);
// Educational demo: insert missing fixtures without resetting existing accounts/products.
for (const file of ['dist/prisma/seed.js', 'dist/prisma/seed-demo.js']) {
  const result = spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
