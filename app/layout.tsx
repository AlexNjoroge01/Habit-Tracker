import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { AccentThemeProvider } from "@/components/accent-theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habit Streak Predictor",
  description: "Track habits and predict streak breaks with Bayesian math",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Synchronously restore accent theme before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var a=localStorage.getItem('accent-theme');if(a&&a!=='default')document.documentElement.setAttribute('data-accent',a)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AccentThemeProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </AccentThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
