# CardFlow

Gift-card rate portal with WhatsApp handoff and Meta WhatsApp Business Platform webhook support.

## Calculation
- Supplier total = supplier rate × card amount
- Owner margin = supplier total × 30%
- Customer payout = supplier total × 70%
- Customer rate = supplier rate × 70% (keeps decimals; no hidden floor rounding)

Example: Chime Mail 1247/$ × $100 = ₦124,700 total, ₦37,410 margin, ₦87,290 customer payout.

## WhatsApp
Current CardFlow WhatsApp: `+2348071895503`.

Customer trade buttons open the customer's own WhatsApp with a pre-filled message to CardFlow.

The Vercel webhook route is:

`/api/whatsapp`

Set `WHATSAPP_VERIFY_TOKEN` to a long random value and `META_APP_SECRET` to your Meta App Secret in Vercel. Keep both private. Redeploy, then use the deployed URL as Meta's Callback URL and enter the same verify token in Meta. Subscribe to the `messages` field after verification.

## Shared rate board and manual publishing
The board reads `/api/rates` every 30 seconds. Until an admin publishes a supplier message, it shows no rates. Customer rates are computed on the server at 70% and supplier rates are omitted from the public API.

Connect an Upstash Redis database to the Vercel project. Vercel provides `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Set `CARDFLOW_PUBLISH_TOKEN` to a unique long random Production secret. The server derives a 10-digit admin PIN from that secret with HMAC-SHA256. The PIN is checked on the server, with five failed attempts allowed per IP per 15 minutes. Successful login sets a 12-hour signed, HTTP-only session cookie. Keep the secret and PIN private.

Sign in to Admin with the PIN. Copy the entire supplier rate list from WhatsApp, paste it into Admin, and click **Publish rates to website**. The server validates the session and list, stores it in Redis, and serves only the 70% customer rates. Invalid messages leave the prior board intact. The published board is shared across visitors; trade statuses are still stored per browser.

The Meta webhook remains available for verification and signed delivery, but it does not publish group messages. Manual publishing does not require the suppliers to change their WhatsApp workflow. Trade statuses still use each browser's local storage and are not a shared back office.
