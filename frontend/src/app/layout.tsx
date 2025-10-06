import type { Metadata } from "next";
import { Fira_Sans, Fira_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";


const FiraSans = Fira_Sans({
  weight: ['400', '700'],
  subsets: ["latin"]
})

const FiraMono = Fira_Mono({
  weight: ['400', '700'],
  subsets: ["latin"]
})

const montserrat = Montserrat({
  weight: ['400', '700'],
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "Cryptic Cabin Leagues",
  description: "Web App for playing and maintaining Cabin Leagues",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ]
  },
  openGraph: {
    siteName: "Cryptic Cabin Leagues",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.className} ${montserrat.className} antialiased`}
      >
        <Navbar />
        <main className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 pt-4 sm:pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
