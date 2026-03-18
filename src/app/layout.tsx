import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Navbar from "@/app/auth/components/Navbar";
import Footer from "@/app/auth/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameHelp",
  description: "GameHelp — сообщество для обсуждения игр, постов, друзей и сообщений.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <div className="app-bg" />
        <Navbar session={session} />
        <main className="container-page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}