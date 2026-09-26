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

## Current automation status
The webhook can verify with Meta and authenticate incoming WhatsApp delivery. It acknowledges events without logging or saving customer messages. A shared database and message processor are still required before supplier rates can update the public rate board for every visitor.
