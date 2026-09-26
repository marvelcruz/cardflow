# CardFlow

Gift-card rate portal with WhatsApp handoff and Meta WhatsApp Business Platform webhook support.

## Calculation
- Supplier total = supplier rate × card amount
- Owner margin = supplier total × (100% − customer percentage)
- Customer payout = supplier total × customer percentage
- Customer rate = supplier rate × customer percentage (keeps decimals; no hidden floor rounding)

Example: Chime Mail 1247/$ × $100 = ₦124,700 total, ₦37,410 margin, ₦87,290 customer payout.

## WhatsApp
Current CardFlow WhatsApp: `+2348071895503`.

Customer trade buttons open the customer's own WhatsApp with a pre-filled message to CardFlow.

The Vercel webhook route is:

`/api/whatsapp`

Set `WHATSAPP_VERIFY_TOKEN` to a long random value and `META_APP_SECRET` to your Meta App Secret in Vercel. Keep both private. Redeploy, then use the deployed URL as Meta's Callback URL and enter the same verify token in Meta. Subscribe to the `messages` field after verification.

## Shared rate board and manual publishing
The board reads `/api/rates` every 30 seconds. Until an admin publishes a supplier message, it shows no rates. The admin can change the customer percentage from 1 to 100 (default 70) and save it to Redis without republishing the supplier message. Customer rates are computed on the server with that shared percentage; supplier rates are omitted from the public API.

Connect an Upstash Redis database to the Vercel project. Vercel provides `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Set `CARDFLOW_PUBLISH_TOKEN` to a unique long random Production secret. The server derives a 10-digit admin PIN from that secret with HMAC-SHA256. The PIN is checked on the server, with five failed attempts allowed per IP per 15 minutes. Successful login sets a 12-hour signed, HTTP-only session cookie. Keep the secret and PIN private.

Sign in to Admin with the PIN. Change **Customer receives** and click **Save percentage** to update the shared board. Copy the entire supplier rate list from WhatsApp, paste it into Admin, and click **Publish rates to website**. The server validates the session and list, stores it in Redis, and serves only customer rates. Invalid messages leave the prior board intact. The published board is shared across visitors; trade statuses are still stored per browser.

You can paste multiple supplier updates together. For each matching card and accepted amount, the highest numeric supplier rate wins; an ASK rate never overrides a numeric rate. Overlapping amount ranges are split so each amount uses the correct best rate. A numeric rate without an accepted amount is displayed as ASK until the amount is confirmed. Do not publish example or stale messages as current rates.

The Meta webhook remains available for verification and signed delivery, but it does not publish group messages. Manual publishing does not require the suppliers to change their WhatsApp workflow. Trade statuses still use each browser's local storage and are not a shared back office.
