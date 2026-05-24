import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Subcuro — подписки в браузере",
  description:
    "Те же данные, что в приложении Subcuro: активные подписки, расход в месяц и ближайшие списания.",
  openGraph: {
    title: "Subcuro — управление подписками",
    description: "Отслеживайте подписки, контролируйте расходы и экономьте с AI-советником.",
    type: "website",
    locale: "ru_RU",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Subcuro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Subcuro — управление подписками",
    description: "Отслеживайте подписки, контролируйте расходы и экономьте с AI-советником.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Anti-flash: apply dark class before first paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('subcuro-profile-prefs-v1');var t=r?JSON.parse(r).theme:'system';if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-sans"
      >
        {children}
      </body>
    </html>
  );
}
