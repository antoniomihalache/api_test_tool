import { createApp } from './app.js';
import { connectDatabase } from './database/connection.js';
import { config } from './config/index.js';
import http from 'http';

async function main() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(config.PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${config.PORT}`);
    console.log(`   Runner mode: ${config.RUNNER_MODE}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received – shutting down gracefully`);
    server.close(async () => {
      const { disconnectDatabase } = await import('./database/connection.js');
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
