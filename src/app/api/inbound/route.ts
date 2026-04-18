import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'

export const maxDuration = 60

const ENTERPRISE_KEYWORDS = [
  'procurement', 'government', 'nhs', 'irs', 'ministry', 'contract',
  'partnership', 'license', 'licence', 'tender', 'rfp', 'enterprise',
  'institutional', 'bulk', 'organisation', 'organization', 'department',
]

const HOLDING_RESPONSE = `Thank you for reaching out to Hive.

This has been noted and will receive personal attention.

— The Hive Team`

const SYSTEM_PROMPT = `You are the Hive support voice. Hive is a social experiment — a collection of free, AI-powered tools built for humans. No ads, no investors, no agenda.

When responding to an email:
- Be warm, genuine, and concise (3–5 sentences max)
- Acknowledge what they've said specifically
- Give a direct, useful answer if you can
- If it's a bug report: thank them genuinely, say it's been noted
- If it's feedback/praise: receive it warmly, don't be sycophantic
- If it's a question about a specific engine: answer briefly and point them to hive.baby
- If uncertain: be honest that you're not sure and invite them to reply
- Never make promises about timelines, features, or commitments
- Sign off as "The Hive Team" — never use a personal name
- Keep the Hive voice: direct, human, no corporate fluff

Do not include greetings or preambles — start with the response directly.`

function isFlagged(subject: string, body: string): { flagged: boolean; keywords: string[] } {
  const text = `${subject} ${body}`.toLowerCase()
  const found = ENTERPRISE_KEYWORDS.filter(kw => text.includes(kw))
  return { flagged: found.length > 0, keywords: found }
}

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
}

async function logEmail(
  sender: string,
  subject: string,
  bodyPreview: string,
  responseSent: string,
  flagged: boolean,
  flagKeywords: string[]
) {
  const sql = getDb()
  await sql`
    INSERT INTO support_emails (sender, subject, body_preview, response_sent, flagged, flag_keywords)
    VALUES (${sender}, ${subject}, ${bodyPreview}, ${responseSent}, ${flagged}, ${flagKeywords})
  `
}

async function generateResponse(senderEmail: string, subject: string, body: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Email from: ${senderEmail}\nSubject: ${subject}\n\n${body}`
    }]
  })
  return (msg.content[0] as { type: string; text: string }).text
}

async function sendEmail(to: string, subject: string, body: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`
  await resend.emails.send({
    from: 'Hive <hive@hive.baby>',
    to,
    subject: replySubject,
    text: body,
  })
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    const sender: string = payload.from || payload.sender || ''
    const subject: string = payload.subject || '(no subject)'
    const body: string = payload.text || payload.html?.replace(/<[^>]+>/g, ' ') || ''
    const bodyPreview = body.slice(0, 500)

    if (!sender) {
      return NextResponse.json({ ok: false, error: 'no sender' }, { status: 400 })
    }

    await ensureTable()

    const { flagged, keywords } = isFlagged(subject, body)

    let responseSent: string
    if (flagged) {
      responseSent = HOLDING_RESPONSE
    } else {
      responseSent = await generateResponse(sender, subject, body)
    }

    await sendEmail(sender, subject, responseSent)
    await logEmail(sender, subject, bodyPreview, responseSent, flagged, keywords)

    return NextResponse.json({ ok: true, flagged, keywords })
  } catch (err) {
    console.error('Support inbound error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
