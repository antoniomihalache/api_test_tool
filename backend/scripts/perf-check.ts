import axios from 'axios';

/**
 * Lightweight backend self-check.
 * Not a load test itself (k6 is the load engine), but useful in CI smoke checks.
 */
async function main() {
  const base = process.env.BASE_URL ?? 'http://localhost:4000';

  try {
    const health = await axios.get(`${base}/health`, { timeout: 5000 });
    console.log('health:', health.data);

    const services = await axios.get(`${base}/api/v1/services`, { timeout: 5000 });
    console.log('services count:', services.data?.data?.length ?? 0);

    console.log('✅ perf-check passed');
  } catch (err) {
    console.error('❌ perf-check failed:', (err as Error).message);
    process.exit(1);
  }
}

main();
