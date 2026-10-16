import 'dotenv/config';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createApp } from '../dist/app';
import { makeDataSource } from '../dist/database/data-source';
import type { SaveUserDto } from '../src/users/dto';

const url =
  process.env.TEST_DATABASE_URL ||
  'postgresql://intenttech:intenttech@127.0.0.1:5434/intenttech_test';
if (!new URL(url).pathname.endsWith('_test'))
  throw new Error('Tests require an isolated database ending in _test.');
process.env.NODE_ENV = 'test';
if (process.env.USE_EMBEDDED_TEST_DATABASE === 'true') process.env.DATABASE_POOL_SIZE = '1';
const db = makeDataSource(url);
let app: Awaited<ReturnType<typeof createApp>>;
let model: SaveUserDto;
let embedded: PGlite | undefined;
let socket: PGLiteSocketServer | undefined;
const copy = () => structuredClone(model);
const counts = async () =>
  (
    await Promise.all(
      ['UserInfoTB', 'UserContactTB', 'User addressTB', 'UserAcamesicsTB'].map((t) =>
        db.query(`SELECT count(*)::int AS count FROM "${t}"`),
      ),
    )
  ).map((r) => r[0].count);
before(async () => {
  if (process.env.USE_EMBEDDED_TEST_DATABASE === 'true') {
    embedded = await PGlite.create();
    socket = new PGLiteSocketServer({
      db: embedded,
      port: 5434,
      host: '127.0.0.1',
    });
    await socket.start();
  }
  app = await createApp(db);
  const photo = await sharp({
    create: { width: 100, height: 100, channels: 3, background: '#8fa881' },
  })
    .png()
    .toBuffer();
  model = {
    userInfo: {
      profilePhoto: `data:image/png;base64,${photo.toString('base64')}`,
      firstName: 'Adé',
      lastName: 'Ọlá',
      dob: '1993-06-15',
      occupation: 'Software Engineer',
      gender: 'Male',
    },
    userContact: {
      email: 'test@example.com',
      phoneNumber: '+234 803 555 0101',
      fax: '+234 1 555 0123',
      linkedInUrl: 'https://www.linkedin.com/in/test-example',
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
          fieldOfStudy: 'Computer Science',
          startDate: '2011-09-01',
          endDate: '2015-06-30',
        },
        {
          schoolName: 'Example Secondary School',
          qualification: 'Senior School Certificate',
          fieldOfStudy: 'General Studies',
          startDate: '2005-09-01',
          endDate: '2011-06-30',
        },
      ],
    },
  };
});
beforeEach(async () => {
  await db.query('TRUNCATE "UserInfoTB" CASCADE');
});
after(async () => {
  await app?.close();
  if (db.isInitialized) await db.destroy();
  await socket?.stop();
  await embedded?.close();
});
test('health verifies a PostgreSQL connection', async () => {
  const r = await request(app.getHttpServer()).get('/api/health').expect(200);
  assert.equal(r.body.database, 'postgresql');
});
test('one POST persists all four groups and returns them', async () => {
  const r = await request(app.getHttpServer()).post('/api/users').send(copy()).expect(201);
  assert.match(r.body.id, /^[0-9a-f-]{36}$/);
  assert.equal(r.body.userAcademics.schools.length, 2);
  assert.deepEqual(await counts(), [1, 1, 1, 2]);
  assert.equal(r.body.userContact.fax, model.userContact.fax);
  assert.match(r.body.userInfo.profilePhoto, /^data:image\/jpeg/);
});
test('GET list and single profile include contact, address and ordered schools', async () => {
  const created = await request(app.getHttpServer()).post('/api/users').send(copy());
  const list = await request(app.getHttpServer()).get('/api/users').expect(200);
  assert.equal(list.body.length, 1);
  const one = await request(app.getHttpServer()).get(`/api/users/${created.body.id}`).expect(200);
  assert.equal(one.body.userAddress.zipCode, '100001');
  assert.equal(one.body.userAcademics.schools[0].schoolName, 'University of Lagos');
});
test('PUT replaces all groups and removes stale school rows', async () => {
  const created = await request(app.getHttpServer()).post('/api/users').send(copy());
  const edit = copy();
  edit.userInfo.occupation = 'Technical Lead';
  edit.userContact.email = 'new@example.com';
  edit.userContact.fax = '';
  edit.userAddress.city = 'Abuja';
  edit.userAcademics.schools = edit.userAcademics.schools.slice(0, 1);
  const r = await request(app.getHttpServer())
    .put(`/api/users/${created.body.id}`)
    .send(edit)
    .expect(200);
  assert.equal(r.body.userInfo.occupation, 'Technical Lead');
  assert.equal(r.body.userContact.email, 'new@example.com');
  assert.equal(r.body.userContact.fax, '');
  assert.equal(r.body.userAddress.city, 'Abuja');
  assert.deepEqual(await counts(), [1, 1, 1, 1]);
});
test('duplicate email is normalized and returns 409 without partial writes', async () => {
  await request(app.getHttpServer()).post('/api/users').send(copy()).expect(201);
  const duplicate = copy();
  duplicate.userContact.email = '  TEST@EXAMPLE.COM  ';
  await request(app.getHttpServer()).post('/api/users').send(duplicate).expect(409);
  assert.deepEqual(await counts(), [1, 1, 1, 2]);
});
test('missing nested object and unknown properties are rejected', async () => {
  const invalid: any = copy();
  delete invalid.userAddress;
  await request(app.getHttpServer()).post('/api/users').send(invalid).expect(400);
  const unknown: any = copy();
  unknown.userInfo.admin = true;
  await request(app.getHttpServer()).post('/api/users').send(unknown).expect(400);
  assert.deepEqual(await counts(), [0, 0, 0, 0]);
});
test('validates required strings, contacts and LinkedIn protocol', async () => {
  for (const kind of ['name', 'email', 'phone', 'linkedin']) {
    const invalid = copy();
    if (kind === 'name') invalid.userInfo.firstName = ' ';
    if (kind === 'email') invalid.userContact.email = 'bad-email';
    if (kind === 'phone') invalid.userContact.phoneNumber = 'abc';
    if (kind === 'linkedin') invalid.userContact.linkedInUrl = 'javascript:alert(1)';
    await request(app.getHttpServer()).post('/api/users').send(invalid).expect(400);
  }
});
test('rejects empty school lists, invalid dates, future DOB and reversed school dates', async () => {
  const empty = copy();
  empty.userAcademics.schools = [];
  await request(app.getHttpServer()).post('/api/users').send(empty).expect(400);
  const invalid = copy();
  invalid.userInfo.dob = '1993-02-30';
  await request(app.getHttpServer()).post('/api/users').send(invalid).expect(400);
  const future = copy();
  future.userInfo.dob = '2999-01-01';
  await request(app.getHttpServer()).post('/api/users').send(future).expect(400);
  const reversed = copy();
  reversed.userAcademics.schools[0].endDate = '2000-01-01';
  await request(app.getHttpServer()).post('/api/users').send(reversed).expect(400);
  assert.deepEqual(await counts(), [0, 0, 0, 0]);
});
test('rejects disguised image bytes and accepts blank optional values', async () => {
  const fake = copy();
  fake.userInfo.profilePhoto = `data:image/png;base64,${Buffer.from('not an image').toString('base64')}`;
  await request(app.getHttpServer()).post('/api/users').send(fake).expect(400);
  const optional = copy();
  optional.userContact.fax = '';
  optional.userContact.linkedInUrl = '';
  optional.userAcademics.schools[0].endDate = '';
  const r = await request(app.getHttpServer()).post('/api/users').send(optional).expect(201);
  assert.equal(r.body.userContact.linkedInUrl, '');
  assert.equal(r.body.userAcademics.schools[0].endDate, '');
});
test('injected academic-table failure rolls back the entire create transaction', async () => {
  await db.query(
    `ALTER TABLE "UserAcamesicsTB" ADD CONSTRAINT "test_failure" CHECK ("schoolName" <> 'force failure')`,
  );
  try {
    const failed = copy();
    failed.userAcademics.schools[1].schoolName = 'force failure';
    await request(app.getHttpServer()).post('/api/users').send(failed).expect(500);
    assert.deepEqual(await counts(), [0, 0, 0, 0]);
  } finally {
    await db.query('ALTER TABLE "UserAcamesicsTB" DROP CONSTRAINT "test_failure"');
  }
});
test('injected academic-table failure rolls back every update and preserves old schools', async () => {
  const created = await request(app.getHttpServer()).post('/api/users').send(copy());
  await db.query(
    `ALTER TABLE "UserAcamesicsTB" ADD CONSTRAINT "test_failure" CHECK ("schoolName" <> 'force failure')`,
  );
  try {
    const edit = copy();
    edit.userInfo.firstName = 'Changed';
    edit.userContact.email = 'changed@example.com';
    edit.userAddress.city = 'Changed';
    edit.userAcademics.schools[0].schoolName = 'force failure';
    await request(app.getHttpServer()).put(`/api/users/${created.body.id}`).send(edit).expect(500);
    const r = await request(app.getHttpServer()).get(`/api/users/${created.body.id}`);
    assert.equal(r.body.userInfo.firstName, model.userInfo.firstName);
    assert.equal(r.body.userContact.email, 'test@example.com');
    assert.equal(r.body.userAddress.city, 'Lagos');
    assert.equal(r.body.userAcademics.schools.length, 2);
  } finally {
    await db.query('ALTER TABLE "UserAcamesicsTB" DROP CONSTRAINT "test_failure"');
  }
});
test('DELETE cascades all related rows and repeated delete returns 404', async () => {
  const created = await request(app.getHttpServer()).post('/api/users').send(copy());
  await request(app.getHttpServer()).delete(`/api/users/${created.body.id}`).expect(204);
  assert.deepEqual(await counts(), [0, 0, 0, 0]);
  await request(app.getHttpServer()).delete(`/api/users/${created.body.id}`).expect(404);
});
test('invalid UUID is 400 and nonexistent records are 404', async () => {
  await request(app.getHttpServer()).get('/api/users/not-a-uuid').expect(400);
  const id = randomUUID();
  await request(app.getHttpServer()).get(`/api/users/${id}`).expect(404);
  await request(app.getHttpServer()).put(`/api/users/${id}`).send(copy()).expect(404);
  await request(app.getHttpServer()).get(`/api/users/${id}/pdf`).expect(404);
});
test('Swagger exposes all five CRUD operations and four request objects', async () => {
  const r = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
  assert.ok(r.body.paths['/api/users'].post);
  assert.ok(r.body.paths['/api/users/{id}'].put);
  assert.ok(r.body.paths['/api/users/{id}'].delete);
  assert.equal(Object.keys(r.body.components.schemas.SaveUserDto.properties).length, 4);
});
test('PDF and DOCX exports are real downloadable files with native editable text', async () => {
  const created = await request(app.getHttpServer()).post('/api/users').send(copy());
  const binary = (res: any, cb: any) => {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };
  const pdf = await request(app.getHttpServer())
    .get(`/api/users/${created.body.id}/pdf`)
    .buffer(true)
    .parse(binary)
    .expect(200);
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.headers['content-disposition'], /attachment/);
  const docx = await request(app.getHttpServer())
    .get(`/api/users/${created.body.id}/docx`)
    .buffer(true)
    .parse(binary)
    .expect(200);
  assert.equal(docx.body.subarray(0, 2).toString(), 'PK');
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/sample-resume.pdf', pdf.body);
  await writeFile('test-results/sample-resume.docx', docx.body);
  const xml = execFileSync('unzip', [
    '-p',
    'test-results/sample-resume.docx',
    'word/document.xml',
  ]).toString();
  for (const value of [
    'Adé',
    'Ọlá',
    'University of Lagos',
    'Computer Science',
    '100001',
    'test@example.com',
    'Fax',
  ])
    assert.ok(xml.includes(value), `Editable DOCX missing ${value}`);
});
