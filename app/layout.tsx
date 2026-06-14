import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScoutBoard",
  description: "The live transfer market for hackathon teams.",
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
