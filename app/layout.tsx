import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cricket Vision Analytics",
  description:
    "Per-delivery cricket analytics from raw video — ball type, line/length, shot type, trajectory, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        lang="en"
        suppressHydrationWarning
      >
        <body className="flex min-h-full flex-col bg-background text-foreground">
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
