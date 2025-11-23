import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube to TikTok Transfer Agent",
  description: "Automatically find trending YouTube videos and transfer them to TikTok",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
