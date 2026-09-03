import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "NexusBoard - Essay Competition Management Platform",
    template: "%s | NexusBoard",
  },
  description: "NexusBoard is an enterprise-grade SaaS platform for managing essay writing competitions. Features multi-role RBAC, blind evaluation, automated scoring, and real-time analytics.",
  keywords: [
    "essay competition",
    "competition management",
    "SaaS platform",
    "online examination",
    "blind evaluation",
    "student registration",
    "essay submission",
    "automated scoring",
    "NexusBoard",
  ],
  authors: [{ name: "Arnab Das", url: "https://github.com/arnab-das234" }],
  creator: "Arnab Das",
   metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nexusboard.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "NexusBoard - Essay Competition Management Platform",
    description: "Enterprise-grade SaaS platform for managing essay writing competitions with multi-role RBAC, blind evaluation, and automated scoring.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://nexusboard.vercel.app",
    siteName: "NexusBoard",
    type: "website",
    locale: "en_US",
    images: [{
      url: "/logo.png",
      width: 1024,
      height: 1024,
      alt: "NexusBoard Logo",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexusBoard - Essay Competition Management Platform",
    description: "Enterprise-grade SaaS platform for managing essay writing competitions.",
    images: ["/logo.png"],
    creator: "@arnabdas234",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
