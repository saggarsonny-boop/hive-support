'use client'
import { useState } from 'react'

export interface SupportEmail {
  id: string
  sender: string
  subject: string | null
  body_preview: string | null
  response_sent: string | null
  flagged: boolean
  flag_keywords: string[] | null
  created_at: string
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
    timeZoneName: 'short',
  })
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: '#9ca3af', display: 'block', marginBottom: 6,
      }}>{label}</span>
      {children}
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      padding: '14px 16px', background: '#f8f7f4', borderRadius: 8,
      fontFamily: 'monospace', color: '#374151',
      maxHeight: 340, overflowY: 'auto',
    }}>
      {children}
    </div>
  )
}

export default function EmailTable({ emails }: { emails: SupportEmail[] }) {
  const [selected, setSelected] = useState<SupportEmail | null>(null)

  return (
    <>
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 13,
          background: '#fff', borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <thead>
            <tr style={{ background: '#1e2d3d' }}>
              {['Timestamp (CDT)', 'From', 'Subject', 'Body preview', 'Flagged'].map(h => (
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
              const base = email.flagged
                ? 'rgba(200,150,10,0.08)'
                : idx % 2 === 0 ? '#fff' : '#fafaf8'
              return (
                <tr
                  key={email.id}
                  onClick={() => setSelected(email)}
                  style={{
                    background: base,
                    borderBottom: `1px solid ${email.flagged ? 'rgba(200,150,10,0.2)' : '#f0ede8'}`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = base }}
                >
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {fmt(email.created_at)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#1e2d3d', maxWidth: 220 }}>
                    <span title={email.sender} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.sender}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#1e2d3d', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {email.subject ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.body_preview ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, padding: '28px 32px',
              maxWidth: 720, width: '100%', maxHeight: '88vh', overflowY: 'auto',
              boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                {selected.flagged && (
                  <div style={{
                    background: '#c8960a', color: '#fff', borderRadius: 5,
                    padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    display: 'inline-block', marginBottom: 10, letterSpacing: '0.05em',
                  }}>
                    ⚑ ENTERPRISE · {selected.flag_keywords?.join(' · ') ?? ''}
                  </div>
                )}
                <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e2d3d', lineHeight: 1.3 }}>
                  {selected.subject ?? '(no subject)'}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                  {fmt(selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: '#f3f4f6', border: 'none', borderRadius: 8,
                  width: 32, height: 32, fontSize: 18, cursor: 'pointer',
                  color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >×</button>
            </div>

            <Section label="From">
              <div style={{
                fontSize: 14, color: '#1e2d3d', fontFamily: 'monospace',
                padding: '10px 14px', background: '#f8f7f4', borderRadius: 8,
                wordBreak: 'break-all',
              }}>
                {selected.sender}
              </div>
            </Section>

            <Section label="Message body (up to 500 chars)">
              <Mono>{selected.body_preview ?? '—'}</Mono>
            </Section>

            <Section label="Auto-response sent">
              <Mono>{selected.response_sent ?? '—'}</Mono>
            </Section>
          </div>
        </div>
      )}
    </>
  )
}
