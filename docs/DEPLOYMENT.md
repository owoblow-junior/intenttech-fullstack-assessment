# Deployment guide

This project is prepared for a NestJS API and PostgreSQL database on Railway, with the React/Vite client on Vercel. Public URLs must be copied from successful provider deployments, not assumed from project names.

## 1 Source repository

Create `intenttech-fullstack-assessment` under the applicant's GitHub account and push this monorepo. Keep `.env`, local databases, dependencies and build intermediates out of Git. The source archive includes the lockfile, setup instructions, source, tests and deployment configuration.

## 2 Railway PostgreSQL

Create a PostgreSQL service in a new Railway project. Use the provider's database connection URL; do not hard-code the example development credentials.

## 3 Railway API

Deploy the repository root as the API service. The included `railway.json` selects `server/Dockerfile` and `/api/health`. The Docker build preserves TypeScript decorator metadata and bundles the Unicode PDF fonts. The runtime uses a non-root Node process.

Set these variables:

| Variable             | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`       | Reference to the project's PostgreSQL connection URL                    |
| `CORS_ORIGINS`       | Exact deployed frontend origin; multiple origins can be comma-separated |
| `NODE_ENV`           | `production`                                                            |
| `DATABASE_SSL`       | Use `true` when the selected database connection requires TLS           |
| `DATABASE_CA_CERT`   | Provider CA PEM if a custom CA is required                              |
| `DATABASE_POOL_SIZE` | `10` for native PostgreSQL, or omit for the default                     |

Railway supplies `PORT`; the API listens on all interfaces. Never disable TLS certificate verification. Use the provider-supported private database connection where available. Migrations run at API startup. For this single-service assessment, keep one API replica during initial migration/deployment.

Generate the API's public domain and verify `/api/health`, `/api/docs` and `/api/openapi.json`. Add the fictional samples once with `npm run seed` using the provider's database environment (or create profiles through the UI). Seeding is explicit and never runs automatically at each deployment.

## 4 Vercel frontend

Import the same repository and set **Root Directory = `client`** and **Framework Preset = Vite**. Enable access to files outside the root directory for the workspace lockfile. Use `npm ci` for installation and `npm run build` for build. The output is `dist`; SPA deep links use `client/vercel.json`.

Set `VITE_API_URL` to the verified Railway API origin followed by `/api`. This is a public API URL, not a database connection string. Never put database credentials in variables prefixed `VITE_`.

Deploy the client, copy the actual frontend origin into Railway's `CORS_ORIGINS`, then redeploy/restart the API with the updated value.

## 5 Live acceptance checks

1. Open the frontend on desktop and mobile and load the fictional profiles.
2. Create a fictional record with a photo and two schools; reload to confirm persistence.
3. Edit the record and remove a school; reload to confirm the stale school was removed.
4. Open the admin dashboard and download PDF and DOCX. Open the DOCX in Word and edit text.
5. Cancel a delete, then confirm deletion of the disposable test profile.
6. Check the independent Swagger CRUD endpoints.
7. Verify that profile deep links load when opened directly.

Only then include the verified app, Swagger and GitHub links in the submission. The assessment email asks for a reply to the original thread copying `careers@intenttech.com`. Sending that email remains a separate user action.

## Provider references

- [Railway Dockerfile builds](https://docs.railway.com/builds/dockerfiles)
- [Railway configuration as code](https://docs.railway.com/config-as-code/reference)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel monorepos](https://vercel.com/docs/monorepos)
