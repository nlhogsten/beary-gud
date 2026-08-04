import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transparent Character Studio",
  description: "Create pixel characters and export clean alpha overlays.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
