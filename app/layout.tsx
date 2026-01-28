import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"
import { AuthProvider } from "@/context/AuthContext"
import FeedbackWidget from "@/components/feedback/FeedbackWidget"
import ClientToaster from "@/components/ui/ClientToaster"
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "ncsStat - Phân tích thống kê cho NCS Việt Nam",
  description: "Công cụ phân tích dữ liệu miễn phí với AI giải thích bằng tiếng Việt",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Analytics />
          <FeedbackWidget />
          <ClientToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
