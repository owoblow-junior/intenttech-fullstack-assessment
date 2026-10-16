# AI usage

IntentTech's assessment email requires AI during development. OpenAI ChatGPT/Codex was used to interpret the supplied requirements, produce the NestJS and React implementation, design the relational model and transactions, implement the document exports, write meaningful verification checks, and investigate test-environment problems.

Verification was performed by running TypeScript builds, the API/database integration suite, the browser workflow checks, and document rendering. Assertions cover failure behavior as well as successful workflows. The verification record distinguishes executed checks from deployment checks that still need to be run.

Key decisions include four nested request objects, an academic `schools` list inside its own object, a single PostgreSQL transaction for every create/update, database constraints and cascading deletion, complete résumé previews in the final two steps, and native editable text in DOCX exports.

The applicant remains responsible for understanding and reviewing the code and demonstrating its behavior during the assessment review.
