# ENGINE_GRAMMAR — HiveAdminSupport

<GrapplerHook>
engine: HiveAdminSupport
version: 1.0.0
governance: QueenBee.MasterGrappler
safety: elevated
multilingual: pending
premium: false
</GrapplerHook>

## Engine Identity
- **Name:** HiveAdminSupport
- **Domain:** support.hive.baby
- **Repo:** saggarsonny-boop/hive-support
- **Status:** Building (code complete, deploy pending quota reset)
- **Stack:** Next.js + TypeScript + Anthropic SDK (claude-opus-4-5) + Resend + Neon PostgreSQL

## Purpose
Auto-acknowledge and Claude-generated reply to all inbound support email. Detects enterprise/institutional keywords and routes to holding response. All other emails receive a warm, Hive-voice AI reply within seconds. Every interaction logged.

## Inputs
- Inbound email via Resend webhook (POST /api/inbound)
- Fields: sender, subject, body

## Outputs
- Auto-reply email sent via Resend from hive@hive.baby
- Enterprise emails: holding response ("This has been noted and will receive personal attention.")
- All others: Claude-generated warm reply (3–5 sentences, Hive voice)
- Log entry: Neon DB (sender, subject, body_preview, response_sent, flagged, flag_keywords)

## Modes
- **Standard:** Claude-generated reply
- **Enterprise flag:** Holding response triggered by keywords: NHS, government, procurement, ministry, contract, university, hospital, WHO, UN, foundation

## Reasoning Steps
1. Receive Resend inbound webhook
2. Check for enterprise keywords in subject + body
3. If enterprise: send holding response, log as flagged
4. If standard: call Claude claude-opus-4-5 with Hive voice prompt
5. Send reply via Resend
6. Log to Neon

## Safety Templates
- Never generate medical, legal, or financial advice in replies
- Never commit to pricing, contracts, or timelines in auto-replies
- Enterprise replies never include AI attribution

## Multilingual Ribbon
- Status: pending (reply in detected language of inbound email)
- MLLR integration: post-QB deployment

## Premium Locks
- Not applicable (internal infrastructure)

## Governance Inheritance
- Governed by: QueenBee.MasterGrappler (pending)
- Safety level: elevated
- Tone: warm

## API Model Strings
- Primary: `claude-opus-4-5`

## Deployment Notes
- Vercel: auto-deploy on push to main
- Domain: support.hive.baby → Cloudflare CNAME → cname.vercel-dns.com
- Deployment Protection: OFF
- Required env vars: ANTHROPIC_API_KEY, RESEND_API_KEY, DATABASE_URL
- Resend inbound routing: hive@hive.baby → support.hive.baby/api/inbound
