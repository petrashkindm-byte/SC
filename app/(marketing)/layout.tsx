import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './landing.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SubCuro — Контролируй регулярные платежи на любом устройстве',
  description:
    'SubCuro синхронизирует подписки, связь, интернет и другие регулярные платежи между веб-версией и приложением.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${outfit.variable}`} style={{ fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {children}
    </div>
  )
}
