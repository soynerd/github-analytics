import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitLume — GitHub, illuminated",
  description: "A beautiful, public GitHub analytics dashboard.",
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
