import { config } from 'dotenv';
import { resolve } from 'node:path';
// Supports both workspace commands and the single-service Docker image.
config({
  path: [resolve(process.cwd(), '.env'), resolve(__dirname, '../../.env')],
  quiet: true,
});
