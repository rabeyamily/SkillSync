import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script, Lora } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillSync",
  description:
    "Analyze your resume against job descriptions to identify skill gaps and improve your career prospects.",
  icons: {
    icon: [
      { url: '/skillsync-logo.png', type: 'image/png' },
    ],
    shortcut: '/skillsync-logo.png',
    apple: '/skillsync-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  
  // Warn if client ID is missing (only in development)
  if (process.env.NODE_ENV === 'development' && !googleClientId) {
    console.warn('⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} ${lora.variable} antialiased`}
        suppressHydrationWarning
      >
        <GoogleOAuthProvider clientId={googleClientId}>
          <ThemeProvider>
            <MainLayout>{children}</MainLayout>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
