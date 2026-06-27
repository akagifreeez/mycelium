import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mycelium — watch an AI agent think as living fungus",
  description:
    "An AI agent's reasoning and tool calls grow as a living, glowing fungus. Tool calls sprout filaments, abandoned plans rot, the solution blooms. Built on the Claude Agent SDK.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
