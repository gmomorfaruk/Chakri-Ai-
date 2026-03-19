import "../styles/globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Chakri AI",
    template: "%s | Chakri AI",
  },
  description: "AI-powered career platform for Bangladesh and beyond.",
  openGraph: {
    title: "Chakri AI",
    description: "AI-powered career platform for Bangladesh and beyond.",
    siteName: "Chakri AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chakri AI",
    description: "AI-powered career platform for Bangladesh and beyond.",
  },
  applicationName: "Chakri AI",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <SupabaseProvider>
              {children}
            </SupabaseProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
