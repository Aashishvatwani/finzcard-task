import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'FINZ AI | AI-Native Financial Review & Forensic Audit System',
  description:
    'Forensic financial statement audit with dual-pass fact verification, active learning rule caching, and interactive citations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-[#F4EFE5] min-h-screen selection:bg-[#C89B5D]/30 selection:text-[#F0D6A3]`}
      >
        {children}
      </body>
    </html>
  );
}
