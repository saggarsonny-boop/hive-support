import { cookies } from 'next/headers'
import { neon } from '@neondatabase/serverless'
import { redirect } from 'next/navigation'
import EmailTable, { type SupportEmail } from './EmailTable'

const ADMIN_PASSWORD = 'hivebees'
const COOKIE_NAME = 'hive_admin_auth'
const COOKIE_VALUE = 'hivebees_ok'

async function loginAction(formData: FormData) {
  'use server'
  const pw = formData.get('password')
  if (pw === ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }
  redirect('/admin/emails')
}

export default async function AdminEmailsPage() {
  const cookieStore = await cookies()
  const authenticated = cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1e2d3d', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '40px 48px', maxWidth: 360, width: '100%',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>🐝</div>
          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700,
            color: '#c8960a', textAlign: 'center', marginBottom: 24, letterSpacing: '0.04em',
          }}>HIVE ADMIN</h1>
          <form action={loginAction}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%', padding: '10px', background: '#c8960a', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.05em',
              }}
            >Enter →</button>
          </form>
        </div>
      </div>
    )
  }

  let emails: SupportEmail[] = []
  let dbError: string | null = null

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT id, sender, subject, body_preview, response_sent,
             flagged, flag_keywords, created_at
      FROM support_emails
      ORDER BY created_at DESC
      LIMIT 500
    `
    emails = rows as SupportEmail[]
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  const flaggedCount = emails.filter(e => e.flagged).length

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#1e2d3d', padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🐝</span>
          <span style={{ color: '#c8960a', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 15, letterSpacing: '0.08em' }}>
            HIVE ADMIN — Support Emails
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {flaggedCount > 0 && (
            <span style={{
              background: 'rgba(200,150,10,0.2)', border: '1px solid #c8960a',
              color: '#c8960a', borderRadius: 20, padding: '2px 12px',
              fontSize: 12, fontWeight: 700,
            }}>
              ⚑ {flaggedCount} flagged
            </span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {emails.length} total
          </span>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {dbError && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13,
          }}>
            DB error: {dbError}
          </div>
        )}

        {emails.length === 0 && !dbError && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: 14 }}>
            No emails logged yet.
          </div>
        )}

        {emails.length > 0 && <EmailTable emails={emails} />}

        <p style={{ marginTop: 20, color: '#9ca3af', fontSize: 11, textAlign: 'center' }}>
          Click any row to read the full email and auto-response. ⚑ = enterprise flag.
          Showing latest {emails.length}.
        </p>
      </div>
    </div>
  )
}
