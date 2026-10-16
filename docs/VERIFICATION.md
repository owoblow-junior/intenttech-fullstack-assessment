# Verification record

Completed on 8 October 2026.

| Check                                    | Result                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| NestJS/TypeScript production compilation | Passed                                                             |
| React/TypeScript/Vite production build   | Passed                                                             |
| Server and client type checks            | Passed                                                             |
| API/database integration suite           | 15 tests passed                                                    |
| Real Chromium workflow suite             | 9 checks passed                                                    |
| PDF rendering and visual inspection      | Passed; Unicode names, complete details, photo and schools visible |
| DOCX rendering and visual inspection     | Passed; headings, text, photo and school records visible           |
| DOCX editable-text assertion             | Passed; actual Word text nodes contain the submitted details       |
| Live Railway/Vercel checks               | Pending sign-in and deployment                                     |
| Native PostgreSQL/Docker deployment run  | Pending deployment environment                                     |

## Executed API checks

The suite ran the compiled NestJS application against an isolated PGlite PostgreSQL engine exposed through the PostgreSQL wire protocol and TypeORM's standard PostgreSQL driver. It checked database row counts across all four tables, CRUD responses, UUID errors, missing records, strict DTO validation, optional values, image decoding, date rules, normalized unique emails, cascade deletion, Swagger schemas and real PDF/DOCX files.

Both rollback checks injected an academic-table constraint failure after earlier table writes. A failed create left no rows in any table. A failed update preserved the original personal details, contact, address and complete school list.

## Executed browser checks

The Chromium runner started a separate NestJS API and frontend with an isolated embedded database. It verified six fictional sample profiles, directory search, all six wizard steps, inline validation, image upload, school add/remove, complete résumé review, explicit final submission, PDF and DOCX downloads, prefilled editing, admin controls, delete cancellation/confirmation, and mobile navigation without page overflow. No browser runtime errors were observed.

Two issues found during this run were corrected: validation messages moving the Continue control during blur, and reusing a button DOM node across the transition from Continue to Submit. The final run confirmed that reaching the résumé preview does not create a record before explicit submission.

## Practical limits

PGlite is an embedded PostgreSQL engine, not a deployed native PostgreSQL instance. These checks exercise SQL constraints and transaction behavior but do not establish multi-connection locking or deployed concurrency performance. Native PostgreSQL checks remain available using a dedicated `TEST_DATABASE_URL` ending in `_test`.

The Dockerfile and provider configurations are prepared, but Docker was not available in this environment. Railway presented a sign-in screen. No GitHub repository, public app URL or deployed database is claimed in this package. Live acceptance checks must be completed before submission.
