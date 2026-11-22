import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormFlow | Campus services",
  description: "Start, save and review campus administrative requests in one workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
