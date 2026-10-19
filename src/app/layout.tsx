import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { CommerceProvider } from "@/context/CommerceContext";
import StorefrontShell from "@/components/layout/StorefrontShell";
import { Suspense } from "react";
import PageLoading from "@/components/ui/PageLoading";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · Home Bedding`,
    template: `%s · ${BRAND.name}`,
  },
  applicationName: BRAND.name,
  description: BRAND.description,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CommerceProvider>
          <Suspense fallback={<PageLoading />}>
            <StorefrontShell>{children}</StorefrontShell>
          </Suspense>
        </CommerceProvider>
      </body>
    </html>
  );
}
