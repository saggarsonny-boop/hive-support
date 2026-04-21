/**
 * Hive Support — Cloudflare Email Worker
 *
 * HOW TO DEPLOY (one-time setup, ~3 minutes):
 *
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create application → Create Worker
 * 2. Name it: hive-support-relay
 * 3. Paste this entire file as the worker script
 * 4. Click "Save and Deploy"
 *
 * 5. In the worker settings → Variables → add:
 *    SUPPORT_WEBHOOK_URL = https://support.hive.baby/api/inbound
 *    WEBHOOK_SECRET      = (choose any strong random string, e.g. openssl rand -hex 32)
 *
 * 6. Also set WEBHOOK_SECRET in Vercel env vars for hive-support project (same value).
 *
 * 7. Go to hive.baby → Email → Email Routing → Rules → Create rule:
 *    Matcher: To address = hive@hive.baby
 *    Action:  Send to a Worker → hive-support-relay
 *    Save
 *
 * Done. Emails to hive@hive.baby will now fire AI responses automatically.
 */

export default {
  async email(message, env, ctx) {
    const from = message.from
    const subject = message.headers.get('subject') || '(no subject)'

    // Read raw MIME email and extract text body
    const rawBytes = await new Response(message.raw).arrayBuffer()
    const rawText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes)
    const bodyText = extractTextBody(rawText)

    const payload = JSON.stringify({ from, subject, text: bodyText })

    const headers = {
      'Content-Type': 'application/json',
    }
    if (env.WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = env.WEBHOOK_SECRET
    }

    const resp = await fetch(env.SUPPORT_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: payload,
    })

    if (!resp.ok) {
      // Forward to catch-all so email isn't lost if webhook fails
      await message.forward('hive@hive.baby')
      throw new Error(`Webhook returned ${resp.status}`)
    }
  },
}

function extractTextBody(raw) {
  // Multipart: extract the text/plain part
  const boundaryMatch = raw.match(/boundary=["']?([^"'\r\n;]+)["']?/i)
  if (boundaryMatch) {
    const boundary = '--' + boundaryMatch[1].trim()
    const parts = raw.split(boundary)
    for (const part of parts) {
      if (/content-type:\s*text\/plain/i.test(part)) {
        const bodyStart = part.indexOf('\r\n\r\n')
        if (bodyStart !== -1) {
          return decodeTransferEncoding(part.slice(bodyStart + 4), part).trim()
        }
      }
    }
    // Fall back to first HTML part stripped of tags
    for (const part of parts) {
      if (/content-type:\s*text\/html/i.test(part)) {
        const bodyStart = part.indexOf('\r\n\r\n')
        if (bodyStart !== -1) {
          return part.slice(bodyStart + 4).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        }
      }
    }
  }

  // Non-multipart: everything after the header block
  const bodyStart = raw.indexOf('\r\n\r\n')
  if (bodyStart !== -1) {
    const body = raw.slice(bodyStart + 4)
    // If it looks like HTML, strip tags
    if (/<html|<body|<p |<div/i.test(body)) {
      return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    return body.trim()
  }

  return ''
}

function decodeTransferEncoding(body, partHeaders) {
  if (/content-transfer-encoding:\s*quoted-printable/i.test(partHeaders)) {
    return body
      .replace(/=\r\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  }
  if (/content-transfer-encoding:\s*base64/i.test(partHeaders)) {
    try {
      return atob(body.replace(/\s/g, ''))
    } catch {
      return body
    }
  }
  return body
}
