import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import sharp from 'sharp';
import { testChromiumPath } from './test-chromium.mjs';

const db = await PGlite.create();
const socket = new PGLiteSocketServer({ db, port: 5543, host: '127.0.0.1' });
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://intenttech:intenttech@127.0.0.1:5543/intenttech_browser_test',
  DATABASE_POOL_SIZE: '1',
  DATABASE_SSL: 'false',
  PORT: '3000',
};
const processes = [];
let browser;
const serverLogs = [];
const checks = [];
const start = (args, options = {}) => {
  const child = spawn(process.execPath, args, {
    env,
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(child);
  child.stdout.on('data', (x) => serverLogs.push(x.toString()));
  child.stderr.on('data', (x) => serverLogs.push(x.toString()));
  return child;
};
const ready = async (url) => {
  for (let n = 0; n < 120; n++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Service did not become ready: ${url}`);
};
const pass = (message) => {
  checks.push(message);
  console.log(`PASS ${message}`);
};
try {
  await socket.start();
  start(['server/dist/main.js']);
  await ready('http://127.0.0.1:3000/api/health');
  await writeFile(
    'docs/openapi.json',
    JSON.stringify(await (await fetch('http://127.0.0.1:3000/api/openapi.json')).json(), null, 2),
  );
  // Seed through the API so the browser fixture exercises the same write path.
  const portrait = async (color) =>
    sharp(
      Buffer.from(
        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="${color}"/><circle cx="100" cy="76" r="35" fill="#eee6d8"/><path d="M30 200v-25a70 60 0 0 1 140 0v25" fill="#eee6d8"/></svg>`,
      ),
    )
      .png()
      .toBuffer();
  const fixture = await portrait('#bca582');
  const template = {
    userInfo: {
      profilePhoto: `data:image/png;base64,${fixture.toString('base64')}`,
      firstName: 'Ada',
      lastName: 'Okafor',
      dob: '1993-06-15',
      occupation: 'Product Designer',
      gender: 'Female',
    },
    userContact: {
      email: 'ada.okafor@example.com',
      phoneNumber: '+234 803 555 0101',
      fax: '',
      linkedInUrl: 'https://www.linkedin.com/in/ada-example',
    },
    userAddress: {
      address: '12 Example Avenue',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
      zipCode: '100001',
    },
    userAcademics: {
      schools: [
        {
          schoolName: 'University of Lagos',
          qualification: 'Bachelor of Science',
          fieldOfStudy: 'Industrial Design',
          startDate: '2011-09-01',
          endDate: '2015-06-30',
        },
        {
          schoolName: 'Example College',
          qualification: 'Senior School Certificate',
          fieldOfStudy: 'General Studies',
          startDate: '2005-09-01',
          endDate: '2011-06-30',
        },
      ],
    },
  };
  const samples = [
    ['Ada', 'Okafor', 'Product Designer'],
    ['Tunde', 'Adeyemi', 'Software Engineer'],
    ['Maya', 'Williams', 'Operations Manager'],
    ['Chidi', 'Nwosu', 'Data Analyst'],
    ['Zara', 'Bello', 'Architect'],
    ['Samuel', 'Mensah', 'Financial Analyst'],
  ];
  const colors = ['#c58564', '#658783', '#ac9682', '#737d9b', '#b59b63', '#8f9772'];
  for (const [index, [first, last, occupation]] of samples.entries()) {
    const p = structuredClone(template);
    Object.assign(p.userInfo, { firstName: first, lastName: last, occupation });
    p.userInfo.gender = ['Tunde', 'Chidi', 'Samuel'].includes(first) ? 'Male' : 'Female';
    p.userInfo.profilePhoto = `data:image/png;base64,${(await portrait(colors[index])).toString('base64')}`;
    p.userContact.email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const r = await fetch('http://127.0.0.1:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    assert.equal(r.status, 201, await r.text());
  }
  start(['../node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: 'client',
  });
  await ready('http://127.0.0.1:5173');
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (process.platform === 'linux' ? await testChromiumPath() : undefined);
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args:
      process.platform === 'linux'
        ? ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu']
        : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('test-results/browser', { recursive: true });
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByText('Ada Okafor', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/overview.png',
    fullPage: true,
    animations: 'disabled',
  });
  pass('Overview and six persisted sample profiles load');
  await page.getByRole('link', { name: 'User management', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search profiles' }).fill('Tunde');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  pass('Search filters and restores the directory');
  await page.getByRole('link', { name: 'Create profile', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Personal information', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('This field is required.', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Upload profile photo').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: fixture,
  });
  await expect(page.getByAltText('Uploaded profile photo')).toBeVisible();
  await page.getByLabel('First name', { exact: true }).fill('Browser');
  await page.getByLabel('Last name', { exact: true }).fill('QA');
  await page.getByLabel('Date of birth', { exact: true }).fill('1995-06-15');
  await page.getByLabel('Occupation', { exact: true }).fill('Quality Engineer');
  await page.getByLabel('Gender', { exact: true }).selectOption('Prefer not to say');
  await page.screenshot({
    path: 'docs/screenshots/wizard.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill('invalid');
  await page.getByLabel('Phone number', { exact: true }).fill('+234 803 555 0109');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill('browser.qa@example.com');
  await page.getByLabel('Fax number').fill('+234 1 555 0123');
  await page.getByLabel('LinkedIn profile URL').fill('https://www.linkedin.com/in/browser-qa');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Street address', { exact: true }).fill('15 QA Avenue');
  await page.getByLabel('City', { exact: true }).fill('Abuja');
  await page.getByLabel('State / region', { exact: true }).fill('FCT');
  await page.getByLabel('Country', { exact: true }).fill('Nigeria');
  await page.getByLabel('Postal / ZIP code', { exact: true }).fill('900001');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const school1 = page.getByRole('region', { name: 'School 1', exact: true });
  await school1.getByLabel('School name', { exact: true }).fill('University of Abuja');
  await school1.getByLabel('Qualification', { exact: true }).fill('Bachelor of Science');
  await school1.getByLabel('Field of study', { exact: true }).fill('Computer Science');
  await school1.getByLabel('Start date', { exact: true }).fill('2013-09-01');
  await school1.getByLabel('End date').fill('2010-06-30');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByText('End date must be on or after the start date.', {
      exact: true,
    }),
  ).toBeVisible();
  await school1.getByLabel('End date').fill('2017-06-30');
  await page.getByRole('button', { name: /Add another school/ }).click();
  await page.getByRole('button', { name: 'Remove school 2', exact: true }).click();
  await page.getByRole('button', { name: /Add another school/ }).click();
  const school2 = page.getByRole('region', { name: 'School 2', exact: true });
  await school2.getByLabel('School name', { exact: true }).fill('QA College');
  await school2.getByLabel('Qualification', { exact: true }).fill('School Certificate');
  await school2.getByLabel('Field of study', { exact: true }).fill('General Studies');
  await school2.getByLabel('Start date', { exact: true }).fill('2007-09-01');
  await school2.getByLabel('End date').fill('2013-06-30');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review details', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Résumé preview' })).toContainText('15 QA Avenue');
  assert.equal((await (await fetch('http://127.0.0.1:3000/api/users')).json()).length, 6);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Résumé preview', exact: true })).toBeVisible();
  assert.equal((await (await fetch('http://127.0.0.1:3000/api/users')).json()).length, 6);
  await page.getByRole('button', { name: 'Create profile', exact: true }).click();
  await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('article', { name: 'Résumé preview' })).toContainText('QA College');
  pass('Six-step wizard validates, uploads photo, adds/removes schools and submits one aggregate');
  await page.screenshot({
    path: 'docs/screenshots/resume.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const ext of ['PDF', 'DOCX']) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('button', {
          name: `Download Browser QA as ${ext}`,
          exact: true,
        })
        .click(),
    ]);
    await download.saveAs(`test-results/browser/resume.${ext.toLowerCase()}`);
  }
  pass('PDF and DOCX download through the résumé screen');
  await page.getByRole('link', { name: 'Edit profile', exact: true }).click();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Browser');
  await page.getByLabel('Occupation', { exact: true }).fill('Senior Quality Engineer');
  for (let n = 0; n < 5; n++)
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Résumé preview' })).toContainText(
    'Senior Quality Engineer',
  );
  pass('Edit wizard loads existing data and persists changes');
  await page.getByRole('link', { name: 'Admin dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin dashboard', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Download Browser QA as DOCX',
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/admin.png',
    fullPage: true,
    animations: 'disabled',
  });
  pass('Admin lists every submission with exports');
  await page.getByRole('link', { name: 'User management', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Browser QA', exact: true }).click();
  await page.getByRole('button', { name: 'Keep profile', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Delete Browser QA', exact: true }).click();
  await page.getByRole('button', { name: 'Delete profile', exact: true }).click();
  await expect(page.getByText('Browser QA', { exact: true })).toHaveCount(0);
  assert.equal((await (await fetch('http://127.0.0.1:3000/api/users')).json()).length, 6);
  pass('Delete confirmation can cancel, then deletes the complete aggregate');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173');
  await expect(
    page.getByRole('heading', {
      name: 'A clear view of your people.',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('Ada Okafor', { exact: true })).toBeVisible();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({
    path: 'docs/screenshots/mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('link', { name: 'User management', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User management', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Create profile', exact: true }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  pass('Mobile layout has no page overflow and navigation works');
  assert.deepEqual(errors, []);
  pass('No browser runtime errors');
  await writeFile(
    'test-results/browser/results.json',
    JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2),
  );
  console.log(`Browser checks complete: ${checks.length} passed.`);
} catch (e) {
  console.error(serverLogs.slice(-12).join(''));
  throw e;
} finally {
  await browser?.close();
  for (const child of processes) child.kill('SIGTERM');
  await socket.stop();
  await db.close();
}
