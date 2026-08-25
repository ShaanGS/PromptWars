import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Inter, 400/500/600 only. A neutral grotesque is what makes the cards,
 * chips and tables read as one clean system rather than as a "designed" page.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Guild — build something together",
  description:
    "Find people, form teams, and bring ideas to life. Guild scores whole teams against what a project needs, so you add the person you are missing instead of another copy of who you have.",
};

export const viewport: Viewport = {
  themeColor: "#f5f6fa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
