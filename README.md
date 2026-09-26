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

## Live rate automation
The board reads `/api/rates` every 30 seconds. Until a verified supplier message is published, it shows no rates. Customer rates are computed on the server at 70% and supplier rates are omitted from the public API.

Connect an Upstash Redis database to the Vercel project. Set these Production environment variables and redeploy:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: the database REST credentials.
- `TRUSTED_SUPPLIER_WA_IDS`: comma separated WhatsApp sender IDs (international digits only, no `+`). Only these direct senders may publish.
- `META_PHONE_NUMBER_ID`: the ID of the Meta business phone number receiving the messages.
- `WHATSAPP_VERIFY_TOKEN` and `META_APP_SECRET`: the existing webhook credentials.

In Meta, subscribe the webhook to the `messages` field. The supplier must send the complete plain text rate list directly to the connected business phone number. This webhook does not read ordinary WhatsApp groups. Incoming POSTs require a valid Meta signature, a trusted sender and matching phone number ID. Duplicate or older messages cannot replace newer rates. Invalid or incomplete lists do not publish. The public board is shared; the prototype admin PIN and trade statuses still use each browser's local storage and are not a secure shared back office.
