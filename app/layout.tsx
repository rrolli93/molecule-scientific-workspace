import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Molecule × VivaMed — Workspace Concept",
  description: "An illustrative scientific workspace walkthrough.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Newsreader: a low-contrast text serif, for the record's own voice.
            IBM Plex Sans / Mono: engineering faces. Plex Mono carries dates,
            paths, hashes and peptide sequences, where bracketed modifications
            have to stay unambiguous.

            Served from this origin, not Google. The workspace verifier asserts
            the browser talks only to us, and a workspace that may hold
            confidential programme data should not announce every page load to
            a third party. */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
