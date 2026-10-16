// Development fallback only. Production uses PostgreSQL 16+ (see compose.yaml).
// PGlite runs the PostgreSQL engine in WASM and exposes the PostgreSQL wire protocol.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const instances = [];
for (const [name, port] of [
  ['development', 5433],
  ['tests', 5434],
]) {
  const db = await PGlite.create(`.local-postgres/${name}`);
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
  await server.start();
  instances.push({ db, server });
}
console.log(
  'Embedded PostgreSQL development server: 5433; isolated test server: 5434. Press Ctrl+C to stop.',
);
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  for (const { db, server } of instances) {
    await server.stop();
    await db.close();
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});
