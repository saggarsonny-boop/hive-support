import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'

export const maxDuration = 60

const ENTERPRISE_KEYWORDS = [
  // Government & regulatory
  'procurement', 'government', 'federal', 'ministry', 'department', 'agency', 'court',
  'nhs', 'hmrc', 'irs', 'dvla', 'fda', 'cdc', 'mhra', 'ema',
  // Healthcare
  'hospital', 'clinical', 'healthcare system', 'health trust',
  // Commercial enterprise
  'contract', 'partnership', 'tender', 'rfp', 'enterprise', 'institutional',
  'license', 'licence', 'bulk', 'organisation', 'organization',
  // Consulting
  'consult', 'consulting', 'advisory', 'engagement', 'retainer',
  // Big tech / enterprise software
  'samsung', 'apple', 'google', 'microsoft', 'adobe',
  'docusign', 'oracle', 'sap', 'salesforce',
]

const TOM_ALLOWED_ENGINES = ['hiveimr', 'hiveplainscan']

const DEFAULT_RESPONSE = `Thank you for getting in touch with Universal Document Incorporated.

We have received your message and will respond within 24 hours.

In the meantime, the UD Reader, Converter, and Validator are all available free at universaldocument.hive.baby — along with the full technical white paper.

Universal Document Incorporated
hive@hive.baby
universaldocument.hive.baby`

const HOLDING_RESPONSE = `Thank you for your interest in Universal Document™ (UD).

Your message has been flagged for personal attention and Sonny Saggar will respond directly within 24 hours.

Universal Document Incorporated
hive@hive.baby
universaldocument.hive.baby`

const SYSTEM_PROMPT = `You are Hive support. Reply warmly and concisely to support emails on behalf of Universal Document Incorporated and the Hive ecosystem. Keep replies under 150 words. Do not make promises about timelines or features unless certain. Always sign off as "Hive Support — hive@hive.baby".`

// ─── Payload normalisation ────────────────────────────────────────────────────
// Accepts: Cloudflare Email Worker JSON, Resend inbound, Postmark, SendGrid, raw

interface NormalisedEmail {
  sender: string
  subject: string
  body: string
}

function normalisePayload(payload: Record<string, unknown>): NormalisedEmail | null {
  // Cloudflare Worker / simple JSON: { from, subject, text }
  if (typeof payload.from === 'string' || typeof payload.sender === 'string') {
    const sender = String(payload.from || payload.sender || '').trim()
    const subject = String(payload.subject || '(no subject)').trim()
    const body = String(
      payload.text ||
      (typeof payload.html === 'string' ? payload.html.replace(/<[^>]+>/g, ' ') : '') ||
      ''
    ).trim()
    if (sender) return { sender, subject, body }
  }

  // Postmark: { From, Subject, TextBody, HtmlBody }
  if (typeof payload.From === 'string') {
    return {
      sender: String(payload.From).trim(),
      subject: String(payload.Subject || '(no subject)').trim(),
      body: String(
        payload.TextBody ||
        (typeof payload.HtmlBody === 'string' ? payload.HtmlBody.replace(/<[^>]+>/g, ' ') : '') ||
        ''
      ).trim(),
    }
  }

  // SendGrid: { envelope: { from }, headers: { Subject }, text }
  if (payload.envelope && typeof payload.envelope === 'object') {
    const env = payload.envelope as Record<string, unknown>
    return {
      sender: String(env.from || '').trim(),
      subject: String(payload.subject || '(no subject)').trim(),
      body: String(payload.text || '').trim(),
    }
  }

  return null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) return true  // no secret configured = open (backwards-compat during setup)
  const header = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  return header === secret
}

// ─── DB ───────────────────────────────────────────────────────────────────────

function getDb() {
  return neon(process.env.DATABASE_URL!)
}

async function ensureTable() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS support_emails (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sender TEXT NOT NULL,
      subject TEXT,
      body_preview TEXT,
      response_sent TEXT,
      flagged BOOLEAN DEFAULT false,
      flag_keywords TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ag_code_payloads (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sender TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      target_engine TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

async function logEmail(
  sender: string, subject: string, bodyPreview: string,
  responseSent: string, flagged: boolean, flagKeywords: string[]
) {
  const sql = getDb()
  await sql`
    INSERT INTO support_emails (sender, subject, body_preview, response_sent, flagged, flag_keywords)
    VALUES (${sender}, ${subject}, ${bodyPreview}, ${responseSent}, ${flagged}, ${flagKeywords})
  `
}

async function logAgCodePayload(sender: string, subject: string, body: string, targetEngine: string) {
  const sql = getDb()
  await sql`
    INSERT INTO ag_code_payloads (sender, subject, body, target_engine)
    VALUES (${sender}, ${subject}, ${body}, ${targetEngine})
  `
}

// ─── Core logic ───────────────────────────────────────────────────────────────

function isFlagged(subject: string, body: string, rawFallback = ''): { flagged: boolean; keywords: string[] } {
  // Scan subject + body + full raw payload (handles MIME-encoded or empty body from CF Worker)
  const text = `${subject} ${body} ${rawFallback}`.toLowerCase()
  const found = ENTERPRISE_KEYWORDS.filter(kw => text.includes(kw))
  return { flagged: found.length > 0, keywords: found }
}

async function generateResponse(senderEmail: string, subject: string, body: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Email from: ${senderEmail}\nSubject: ${subject}\n\n${body}` }]
  })
  return (msg.content[0] as { type: string; text: string }).text
}

async function sendEmail(to: string, subject: string, body: string, cc?: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`
  
  const emailOptions: any = {
    from: 'Hive <hive@hive.baby>',
    to,
    subject: replySubject,
    text: body,
  }
  
  if (cc) {
    emailOptions.cc = cc
  }

  await resend.emails.send(emailOptions)
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 })
  }

  try {
    const rawPayload = await req.json() as Record<string, unknown>
    const email = normalisePayload(rawPayload)

    if (!email || !email.sender) {
      return NextResponse.json({ ok: false, error: 'could not parse sender from payload' }, { status: 400 })
    }

    const { sender, subject, body } = email
    const bodyPreview = body.slice(0, 500)

    await ensureTable()

    // rawFallback ensures keywords in MIME-encoded or partially-extracted bodies are still caught
    const rawFallback = JSON.stringify(rawPayload)

    // Intercept [AG-CODE] payloads
    const combinedText = `${subject} ${body} ${rawFallback}`.toUpperCase()
    if (combinedText.includes('[AG-CODE]')) {
      // Parse engine name, e.g. [AG-CODE] HiveIMR
      const match = subject.match(/\[AG-CODE\]\s*([a-zA-Z0-9_-]+)/i)
      const targetEngine = match ? match[1].toLowerCase() : ''
      
      if (!targetEngine) {
        const rejectMessage = `Your code payload was rejected.\n\nReason: No engine name was found in the subject line.\nPlease ensure your subject follows this format: [AG-CODE] EngineName\n\n- Antigravity (Lead Engineer)`
        await sendEmail(sender, subject, rejectMessage, 'sonny@hive.baby')
        return NextResponse.json({ ok: true, ag_code: true, status: 'rejected_no_engine' })
      }
      
      if (!TOM_ALLOWED_ENGINES.includes(targetEngine)) {
        const rejectMessage = `Your code payload for "${match![1]}" was rejected.\n\nReason: You are not currently authorized to submit code for this engine. Your approved engines are: HiveIMR, HivePlainScan.\n\n- Antigravity (Lead Engineer)`
        await sendEmail(sender, subject, rejectMessage, 'sonny@hive.baby')
        return NextResponse.json({ ok: true, ag_code: true, status: 'rejected_unauthorized_engine' })
      }
      
      await logAgCodePayload(sender, subject, body, targetEngine)
      
      const ackMessage = `Code payload for "${match![1]}" successfully received and stored securely in the Hive database for Antigravity processing.\n\nSender: ${sender}\nSubject: ${subject}\n\n- Antigravity (Lead Engineer)`
      await sendEmail(sender, subject, ackMessage, 'sonny@hive.baby')
      
      return NextResponse.json({ ok: true, ag_code: true, status: 'accepted' })
    }

    const { flagged, keywords } = isFlagged(subject, body, rawFallback)

    const responseSent = flagged ? HOLDING_RESPONSE : DEFAULT_RESPONSE

    await sendEmail(sender, subject, responseSent)
    await logEmail(sender, subject, bodyPreview, responseSent, flagged, keywords)

    return NextResponse.json({ ok: true, flagged, keywords })
  } catch (err) {
    console.error('Support inbound error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// Health check — confirms the endpoint is reachable
export async function GET() {
  return NextResponse.json({ ok: true, service: 'HiveAdminSupport inbound', ready: true })
}
