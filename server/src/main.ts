import './env';
import { createApp } from './app';
async function main() {
  const app = await createApp();
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
main().catch((e) => {
  console.error('API could not start:', e.message);
  process.exitCode = 1;
});
