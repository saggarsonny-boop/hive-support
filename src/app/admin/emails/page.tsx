import { cookies } from 'next/headers'
import { neon } from '@neondatabase/serverless'
import { redirect } from 'next/navigation'

const ADMIN_PASSWORD = 'hivebees'
const COOKIE_NAME = 'hive_admin_auth'
const COOKIE_VALUE = 'hivebees_ok'

interface SupportEmail {
  id: string
  sender: string
  subject: string | null
  body_preview: string | null
  response_sent: string | null
  flagged: boolean
  flag_keywords: string[] | null
  created_at: string
}

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

        {emails.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 13,
              background: '#fff', borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <thead>
                <tr style={{ background: '#1e2d3d' }}>
                  {['Timestamp', 'From', 'Subject', 'Body preview', 'Response', 'Flagged'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.7)',
                      fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emails.map((email, idx) => {
                  const flagRow = email.flagged
                  return (
                    <tr key={email.id} style={{
                      background: flagRow
                        ? 'rgba(200,150,10,0.08)'
                        : idx % 2 === 0 ? '#fff' : '#fafaf8',
                      borderBottom: `1px solid ${flagRow ? 'rgba(200,150,10,0.2)' : '#f0ede8'}`,
                    }}>
                      <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(email.created_at).toLocaleString('en-US', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                          hour12: true,
                          timeZone: 'America/Chicago',
                          timeZoneName: 'short',
                        })}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1e2d3d', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.sender}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1e2d3d', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {email.subject ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.body_preview ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span title={email.response_sent ?? ''} style={{ cursor: 'help' }}>
                          {email.response_sent ? email.response_sent.slice(0, 80) + (email.response_sent.length > 80 ? '…' : '') : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {email.flagged ? (
                          <span style={{
                            background: '#c8960a', color: '#fff', borderRadius: 4,
                            padding: '2px 8px', fontSize: 11, fontWeight: 700,
                          }} title={email.flag_keywords?.join(', ')}>⚑ YES</span>
                        ) : (
                          <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: 20, color: '#9ca3af', fontSize: 11, textAlign: 'center' }}>
          Flagged emails require Sonny&apos;s attention — hover ⚑ to see matched keywords.
          Showing latest {emails.length}.
        </p>
      </div>
    </div>
  )
}
