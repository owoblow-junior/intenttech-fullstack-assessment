import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialProfiles1791410000000 implements MigrationInterface {
  name = 'InitialProfiles1791410000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "UserInfoTB" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "profilePhoto" text NOT NULL,
      "firstName" varchar(80) NOT NULL, "lastName" varchar(80) NOT NULL, "dob" date NOT NULL,
      "occupation" varchar(120) NOT NULL, "gender" varchar(32) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "gender_allowed" CHECK ("gender" IN ('Female','Male','Non-binary','Prefer not to say')),
      CONSTRAINT "valid_dob" CHECK ("dob" >= '1900-01-01' AND "dob" <= CURRENT_DATE))`);
    await q.query(`CREATE TABLE "UserContactTB" (
      "userId" uuid PRIMARY KEY REFERENCES "UserInfoTB"("id") ON DELETE CASCADE,
      "email" varchar(254) NOT NULL UNIQUE, "phoneNumber" varchar(30) NOT NULL,
      "fax" varchar(30), "linkedInUrl" varchar(300),
      CONSTRAINT "email_normalized" CHECK ("email" = lower("email")))`);
    await q.query(`CREATE TABLE "User addressTB" (
      "userId" uuid PRIMARY KEY REFERENCES "UserInfoTB"("id") ON DELETE CASCADE,
      "address" varchar(250) NOT NULL, "city" varchar(100) NOT NULL,
      "state" varchar(100) NOT NULL, "country" varchar(100) NOT NULL, "zipCode" varchar(20) NOT NULL)`);
    await q.query(`CREATE TABLE "UserAcamesicsTB" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES "UserInfoTB"("id") ON DELETE CASCADE,
      "position" integer NOT NULL, "schoolName" varchar(160) NOT NULL, "qualification" varchar(120) NOT NULL,
      "fieldOfStudy" varchar(120) NOT NULL, "startDate" date NOT NULL, "endDate" date,
      CONSTRAINT "school_dates" CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
      CONSTRAINT "school_order" UNIQUE ("userId", "position"))`);
    await q.query('CREATE INDEX "users_created_idx" ON "UserInfoTB" ("createdAt" DESC)');
  }
  async down(q: QueryRunner): Promise<void> {
    for (const t of ['UserAcamesicsTB', 'User addressTB', 'UserContactTB', 'UserInfoTB'])
      await q.query(`DROP TABLE "${t}"`);
  }
}
