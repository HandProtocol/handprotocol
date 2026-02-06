import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Raise — HAND Protocol Foundation',
  description:
    'Support HAND Protocol in becoming a nonprofit foundation. Regenerative infrastructure for healers, impact entrepreneurs, and community organizations in Austin, Texas.',
  openGraph: {
    title: 'HAND Protocol Foundation — Raise',
    description:
      'Building regenerative infrastructure for those who heal, build, and serve. Donate on Giveth or contribute directly.',
    type: 'website'
  }
}

export default function RaiseLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
