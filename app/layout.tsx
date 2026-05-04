import type { Metadata } from "next";
import { Geist, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Chris' Delicious Library",
  description: "Chris' personal library of books, TV shows, movies, and games",
  applicationName: "Chris' Delicious Library",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/mobile-icon-2.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/mobile-icon-2.png", sizes: "512x512", type: "image/png" }],
    shortcut: ["/mobile-icon-2.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Chris' Delicious Library",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
