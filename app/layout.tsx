import type { Metadata, Viewport } from 'next';
import { Kantumruy_Pro } from 'next/font/google';
import './globals.css'; // Global styles

// Modern, highly legible Khmer + Latin typeface
const kantumruy = Kantumruy_Pro({
  subsets: ['khmer', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kantumruy',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SecureAttend — ប្រព័ន្ធកត់ត្រាវត្តមានឌីជីថល',
  description:
    'ប្រព័ន្ធកត់ត្រាវត្តមានបុគ្គលិកដ៏ទំនើប ប្រកបដោយសុវត្ថិភាព៖ ផ្ទៀងផ្ទាត់ទីតាំង GPS, ថតមុខ Selfie, ស្កេន QR និងជូនដំណឹងភ្លាមៗតាម Telegram។ សាកសមសម្រាប់គ្រប់ស្ថាប័ន។',
  keywords: ['វត្តមាន', 'attendance', 'SecureAttend', 'GPS', 'Telegram', 'Cambodia', 'HR'],
  applicationName: 'SecureAttend',
  authors: [{ name: 'SecureAttend' }],
  openGraph: {
    title: 'SecureAttend — ប្រព័ន្ធកត់ត្រាវត្តមានឌីជីថល',
    description:
      'ផ្ទៀងផ្ទាត់ទីតាំង GPS · ថតមុខ · ស្កេន QR · ជូនដំណឹង Telegram ភ្លាមៗ។ ដំណោះស្រាយវត្តមានទំនើបសម្រាប់ស្ថាប័នរបស់អ្នក។',
    type: 'website',
    locale: 'km_KH',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" className={kantumruy.variable} suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
