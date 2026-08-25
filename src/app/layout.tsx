import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** Display: a wide geometric grotesque, headings only. */
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/** Body: neutral, so the headings and the mono chips do the talking. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Mono carries every chip, tag, duration and figure. */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Guild — build something together",
  description:
    "Find people, form teams, and bring ideas to life. Guild scores whole teams against what a project needs, so you add the person you are missing instead of another copy of who you have.",
};

export const viewport: Viewport = {
  themeColor: "#0b0e11",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
