import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPMG Code Lab",
  description: "A focused practice space for code and questions.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
