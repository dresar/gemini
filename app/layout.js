import './globals.css'
import ClientLayout from '@/components/ClientLayout'

export const metadata = {
  title: 'Gemini Key Manager — Dashboard Admin',
  description: 'Sistem manajemen 100+ API key Google Gemini dengan rotasi otomatis, monitoring, dan dashboard admin.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-surface-950">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
