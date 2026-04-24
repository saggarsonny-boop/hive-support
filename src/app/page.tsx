export default function SupportPage() {
  const SUPPORT_LINK_MONTHLY = 'https://support.hive.baby'  // TODO: replace with buy.stripe.com link after running create-support-products.js
  const SUPPORT_LINK_ANNUAL  = 'https://support.hive.baby'  // TODO: replace with buy.stripe.com link
  const SUPPORT_LINK_ONETIME = 'https://support.hive.baby'  // TODO: replace with buy.stripe.com link

  const options = [
    {
      label: 'Monthly',
      price: '$1.99',
      unit: '/mo',
      description: 'Ongoing priority access. Cancel any time.',
      cta: 'Subscribe monthly',
      href: SUPPORT_LINK_MONTHLY,
      highlight: true,
    },
    {
      label: 'Annual',
      price: '$19',
      unit: '/yr',
      description: 'Best value. Save ~20% vs monthly.',
      cta: 'Subscribe annually',
      href: SUPPORT_LINK_ANNUAL,
      highlight: false,
    },
    {
      label: 'One-time',
      price: '$5',
      unit: '',
      description: 'Single query. No subscription.',
      cta: 'Pay once',
      href: SUPPORT_LINK_ONETIME,
      highlight: false,
    },
  ]

  const faqs = [
    {
      q: 'What do I get with Priority Support?',
      a: 'A human reads your message and responds — not a bot, not an auto-reply. You get direct help with any Hive engine or Universal Document™ tool.',
    },
    {
      q: 'How fast will I get a response?',
      a: 'Within 24 hours, typically much sooner. If your issue is urgent, say so and we prioritise.',
    },
    {
      q: 'What can I ask about?',
      a: 'Anything across the Hive ecosystem: Universal Document™ tools, converter issues, format questions, feature requests, billing, or anything else.',
    },
    {
      q: 'Can I cancel my subscription?',
      a: 'Yes, any time — from your Stripe customer portal. No cancellation fees, no questions asked.',
    },
    {
      q: 'Can I just email for free?',
      a: 'Yes — hive@hive.baby reaches us. Priority Support means you move to the front of the queue and get a guaranteed response window.',
    },
  ]

  return (
    <main style={{ flex: 1, padding: '60px 24px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🐝</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e8f4fd', marginBottom: 12, letterSpacing: '-0.02em' }}>
          Hive Priority Support
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(180,200,225,0.7)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Real help from real humans. Every Hive engine, every Universal Document™ tool.
          Human response within 24 hours.
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 56 }}>
        {options.map(opt => (
          <div key={opt.label} style={{
            background: opt.highlight ? 'rgba(212,170,50,0.12)' : 'rgba(13,31,53,0.6)',
            border: opt.highlight ? '1px solid rgba(212,170,50,0.5)' : '1px solid rgba(13,31,53,0.8)',
            borderRadius: 12,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(180,200,225,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              {opt.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#e8f4fd' }}>{opt.price}</span>
              <span style={{ fontSize: 14, color: 'rgba(180,200,225,0.5)' }}>{opt.unit}</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(180,200,225,0.6)', marginBottom: 20, lineHeight: 1.5 }}>
              {opt.description}
            </p>
            <a href={opt.href} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', width: '100%', padding: '11px',
              background: opt.highlight ? 'rgba(212,170,50,0.9)' : 'rgba(26,58,92,0.8)',
              color: opt.highlight ? '#0d1f35' : '#e8f4fd',
              borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 600, textAlign: 'center',
              transition: 'opacity 0.15s',
            }}>
              {opt.cta} →
            </a>
          </div>
        ))}
      </div>

      {/* What's included */}
      <div style={{ background: 'rgba(13,31,53,0.6)', border: '1px solid rgba(13,31,53,0.8)', borderRadius: 12, padding: '28px 32px', marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4fd', marginBottom: 16 }}>What&apos;s included</h2>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Human reads and responds — not a bot',
            'Covers all Hive engines and Universal Document™ tools',
            'Feature requests heard and logged',
            'Guaranteed response within 24 hours',
            'Direct email thread — no ticket system',
          ].map(item => (
            <li key={item} style={{ fontSize: 14, color: 'rgba(180,200,225,0.75)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: 'rgba(212,170,50,0.8)', flexShrink: 0 }}>✦</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4fd', marginBottom: 20 }}>FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map(faq => (
            <div key={faq.q} style={{ borderBottom: '1px solid rgba(13,31,53,0.8)', paddingBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd', marginBottom: 6 }}>{faq.q}</p>
              <p style={{ fontSize: 14, color: 'rgba(180,200,225,0.65)', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Free contact */}
      <div style={{ textAlign: 'center', padding: '28px', background: 'rgba(13,31,53,0.4)', borderRadius: 12 }}>
        <p style={{ fontSize: 14, color: 'rgba(180,200,225,0.55)', marginBottom: 6 }}>
          Not ready to subscribe? Free contact always available.
        </p>
        <a href="mailto:hive@hive.baby" style={{ fontSize: 15, fontWeight: 600, color: 'rgba(180,200,225,0.8)', textDecoration: 'none' }}>
          hive@hive.baby
        </a>
      </div>
    </main>
  )
}
