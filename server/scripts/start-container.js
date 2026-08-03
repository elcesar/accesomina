import { spawnSync } from 'node:child_process';

if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
  const migration = spawnSync('pnpm', ['run', 'migrate'], { stdio: 'inherit' });
  if (migration.status !== 0) process.exit(migration.status || 1);
}

await import('../index.js');
