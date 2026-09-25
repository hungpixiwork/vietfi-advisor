import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "VietFi Advisor — Cố Vấn Tài Chính AI Cho Người Việt",
  description:
    "Nền tảng cố vấn tài chính AI thông minh giúp người Việt vượt qua nhiễu loạn thông tin, phân tích sentiment thị trường và đưa ra quyết định phân bổ vốn hiệu quả. Tích hợp multi-agent AI pipeline.",
  keywords: [
    "tài chính cá nhân",
    "cố vấn tài chính",
    "AI advisor",
    "đầu tư thông minh",
    "sentiment analysis",
    "fear and greed index vietnam",
    "personal CPI",
    "quản lý tài chính",
  ],
  authors: [{ name: "VietFi Team" }],
  openGraph: {
    title: "VietFi Advisor — Cố Vấn Tài Chính AI",
    description: "Multi-agent AI phân tích thị trường tài chính Việt Nam",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F8FAFC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />
      </head>
      <body className={`${notoSans.variable} font-sans antialiased`}>
        {children}
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
