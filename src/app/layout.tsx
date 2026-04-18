import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'Hive Support',
  description: 'Hive email support system.',
  robots: 'noindex',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
