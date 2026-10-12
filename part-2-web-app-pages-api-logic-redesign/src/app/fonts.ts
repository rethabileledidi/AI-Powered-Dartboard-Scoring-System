import { Big_Shoulders, Figtree, Geist_Mono } from "next/font/google";

/*
 * Typefaces
 *   Big Shoulders – tall, condensed scoreboard lettering for headings and numbers
 *   Figtree       – everything you read
 *   Geist Mono    – code-like values
 */

const display = Big_Shoulders({
  variable: "--font-display-face",
  subsets: ["latin"],
  fallback: ["Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Class names that expose the three font variables; put them on <html>. */
export const fontVariables = `${display.variable} ${body.variable} ${mono.variable}`;
