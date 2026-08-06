import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOXL Studio",
  description: "Create, edit, validate, preview, and export engine-specific visual assets.",
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
