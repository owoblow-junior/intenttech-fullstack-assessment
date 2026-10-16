// Extract the official npm-bundled browser without attempting to change file ownership.
// This supports test containers where chown and native browser downloads are unavailable.
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createBrotliDecompress } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from 'tar-fs';
export async function testChromiumPath() {
  const base = join(tmpdir(), 'intenttech-test-chromium');
  await mkdir(base, { recursive: true });
  const bin = join(dirname(fileURLToPath(import.meta.resolve('@sparticuz/chromium'))), '../bin');
  const executable = join(base, 'chromium');
  if (!(await stat(executable).catch(() => null))) {
    await pipeline(
      createReadStream(join(bin, 'chromium.br')),
      createBrotliDecompress(),
      createWriteStream(executable, { mode: 0o700 }),
    );
    await mkdir(join(base, 'fonts'), { recursive: true });
    await pipeline(
      createReadStream(join(bin, 'fonts.tar.br')),
      createBrotliDecompress(),
      extract(join(base, 'fonts'), { chown: false }),
    );
    await pipeline(
      createReadStream(join(bin, 'swiftshader.tar.br')),
      createBrotliDecompress(),
      extract(base, { chown: false }),
    );
  }
  const config = join(base, 'fonts', 'fonts.conf');
  await mkdir(join(base, 'font-cache'), { recursive: true });
  await writeFile(
    config,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${join(base, 'fonts', 'fonts')}</dir><dir>/usr/share/fonts</dir><cachedir>${join(base, 'font-cache')}</cachedir></fontconfig>`,
  );
  process.env.FONTCONFIG_PATH = join(base, 'fonts');
  process.env.FONTCONFIG_FILE = config;
  process.env.LD_LIBRARY_PATH = [base, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  return executable;
}
