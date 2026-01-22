import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Pastikan Anda memiliki file globals.css dengan directive Tailwind

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MAHASANTRI SITE - Academic & Gallery",
  description: "Portal Akademik dan Galeri Karya Digital Mahasantri",
  icons: {
    icon: 'https://hafizwrg.github.io/mahasantri/lo.png', // <--- Icon baru kamu
    apple: 'https://hafizwrg.github.io/mahasantri/lo.png', // Opsional: untuk iPhone/iPad
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
