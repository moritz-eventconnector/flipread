import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flipread.de'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FlipRead - Interaktive Flipbooks aus PDFs erstellen',
    template: '%s | FlipRead'
  },
  description: 'Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks. Perfekt für Magazine, Kataloge, Präsentationen und mehr. Kostenlos starten, keine Kreditkarte erforderlich.',
  keywords: ['Flipbook', 'PDF zu Flipbook', 'Interaktive Dokumente', 'Digital Publishing', 'PDF Converter', 'Online Flipbook', 'E-Magazine', 'Katalog', 'Präsentation'],
  authors: [{ name: 'FlipRead' }],
  creator: 'FlipRead',
  publisher: 'FlipRead',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: siteUrl,
    siteName: 'FlipRead',
    title: 'FlipRead - Interaktive Flipbooks aus PDFs erstellen',
    description: 'Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks. Perfekt für Magazine, Kataloge, Präsentationen und mehr.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'FlipRead - Interaktive Flipbooks',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlipRead - Interaktive Flipbooks aus PDFs erstellen',
    description: 'Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

