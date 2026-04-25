import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#C9847A",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://promptcloset.com"),
  title: "Prompt Closet — Your AI-Powered Personal Stylist",
  description:
    "AI-powered wardrobe management that learns your style, creates perfect outfits, and helps you wear everything you own. Smart closet, magic styling, digital twin try-on.",
  keywords: [
    "AI stylist",
    "wardrobe management",
    "outfit suggestions",
    "personal stylist",
    "digital twin",
    "virtual try-on",
  ],
  authors: [{ name: "Prompt Closet" }],
  openGraph: {
    title: "Prompt Closet — Your AI-Powered Personal Stylist",
    description:
      "AI-powered wardrobe management that learns your style, creates perfect outfits, and helps you wear everything you own.",
    type: "website",
    locale: "en_SG",
    siteName: "Prompt Closet",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Prompt Closet Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Closet — Your AI-Powered Personal Stylist",
    description:
      "AI-powered wardrobe management that learns your style, creates perfect outfits, and helps you wear everything you own.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
