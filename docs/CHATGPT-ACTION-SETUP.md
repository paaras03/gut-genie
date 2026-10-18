# ChatGPT Action setup for Gut Genie

This connects a private custom GPT to the existing Google Apps Script API so it can write event records and read them back.

## Important limitations

- This Action is not connected to this ordinary ChatGPT conversation automatically. You must configure it in a custom GPT that supports Actions.
- The current Apps Script authenticates requests using `token` in the JSON body. Do not reuse a broad production token in a shared/public GPT.
- Keep the GPT private. Prefer creating a dedicated, rotated token for this integration. Never commit the token to GitHub or paste it into chat.
- The Action specification uses a placeholder server URL. Replace it with your deployed Web App URL ending in `/exec`.
- A successful Action response is not proof of persistence until we read the record back using `dashboard` or `events`.

## 1. Get the deployed URL

Apps Script → Deploy → Manage deployments → Web app URL. It should end in `/exec`.

## 2. Add the Action

1. Open the GPT editor and create a private GPT named **Gut Genie Logger**.
2. Enable **Actions**.
3. Import `docs/GUT-GENIE-ACTION-OPENAPI.yaml`.
4. Replace the placeholder server URL with your real deployment URL.
5. Save the Action configuration.

## 3. Supply authentication safely

The current API expects `token` in each JSON body. OpenAPI Actions' standard API-key authentication sends credentials in a header, but the current Apps Script implementation does not read that header. Do not select header-based API-key authentication unless the Apps Script backend is changed to support it.

For a private proof of concept, use a dedicated token only if you are comfortable storing it in the private GPT's configuration/instructions. A better production setup is to update the backend to support a dedicated credential and validate it, then test that the credential is never exposed in responses. Do not place any token in this file or GitHub.

## 4. Configure GPT instructions

Use these instructions, then add the credential using the private GPT configuration mechanism you choose:

> You are Gut Genie Logger. When the user reports food, symptoms, sleep, exercise, or a bowel movement, convert only explicitly stated facts into a structured record. Ask a concise follow-up if the event type or necessary timestamp is unclear. Use Asia/Kolkata for local dates when the user gives local time without a timezone. Do not infer unreported quantities or symptoms. Call the log-event Action with event_type set to food, symptom, sleep, exercise, or bowel and an idempotency_key unique to the source message/event. After a successful write, call dashboard for the event's local_date or events for that date and verify the record appears. Tell the user whether it was saved, and never claim success if verification fails. Never run setup-schema, update-event, or other mutating actions unless explicitly requested.

## 5. Write-and-read test

After the Action is configured, ask the private GPT:

“Create one clearly labelled synthetic food test record for 17 October 2026 at 8:30 AM IST: test meal, oats 40 g and blueberries 40 g. Notes: synthetic integration test; not real food history. Use idempotency key GG_TEST_20261017_FOOD_01. Then read back that date and confirm the test record exists.”

Expected:
- `log-event` returns `success: true` and a record ID.
- A follow-up `dashboard` request for `2026-10-17` includes the record in `events` and count `food: 1` (unless other records exist).
- The same record appears in the Food Log sheet.
- Scriptable displays it after rerunning the app and selecting that date.

If authentication fails, do not paste the token into this conversation. Update the private integration credential and Apps Script authentication design first.
