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

Connect an Upstash Redis database to the Vercel project. Vercel automatically provides `KV_REST_API_URL` and `KV_REST_API_TOKEN`. To use manual publishing, set `CARDFLOW_PUBLISH_TOKEN` to a unique long random value as a Production secret and redeploy. The admin enters that value in the private publish key field each time; it is not saved in the browser. The browser PIN only hides the admin interface on one device and is not server authentication.

Copy the entire supplier rate list from WhatsApp, paste it into Admin, enter the private publish key, and click **Publish rates to website**. The server validates the list, stores it in Redis, and serves only the 70% customer rates. Invalid messages leave the prior board intact. The published board is shared across visitors; trade statuses are still stored per browser.

The Meta webhook remains available for verification and signed delivery, but it does not publish group messages. Manual publishing does not require the suppliers to change their WhatsApp workflow. The prototype admin PIN and trade statuses still use each browser's local storage and are not a secure shared back office.
