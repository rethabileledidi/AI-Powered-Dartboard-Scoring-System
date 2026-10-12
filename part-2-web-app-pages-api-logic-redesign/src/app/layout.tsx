import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { LightweightProvider } from "@/context/lightweight";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "AI Dart Scoring System",
  description: "Intelligent dart detection and real-time scoring system powered by AI",
  keywords: ["AI", "Dart", "Scoring", "Computer Vision", "YOLO", "Real-time"],
  authors: [{ name: "AI Dart Scoring Team" }],
  openGraph: {
    title: "AI Dart Scoring System",
    description: "Intelligent dart detection and real-time scoring system",
    url: "https://ai-dart-scoring.com",
    siteName: "AI Dart Scoring",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Dart Scoring System",
    description: "Intelligent dart detection and real-time scoring system",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LightweightProvider>
            {children}
            <Toaster />
          </LightweightProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
