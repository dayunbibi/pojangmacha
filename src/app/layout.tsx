import type { Metadata, Viewport } from "next";
import "./globals.css";

// Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time, so the domain is never hardcoded.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "향수병 포차",
  description: "손님 5명, 메뉴 5개. 염통꼬치 굽고 김밥 말고 떡볶이 졸여서 오늘 장사 마감하기.",
  openGraph: {
    title: "향수병 포차",
    description: "오늘 장사 매출은 얼마? 염통꼬치 · 김밥 · 떡볶이 · 어묵 · 계란빵",
    locale: "ko_KR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#12151d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* Korean fonts. Loaded with a link tag because next/font only preloads latin subsets */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* root layout = every page, so this rule doesn't apply in the app router */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Nanum+Brush+Script&family=Nanum+Gothic+Coding:wght@400;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
