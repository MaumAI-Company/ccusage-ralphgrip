import type { ReactNode } from "react";

// Root layout is a pass-through — locale-specific layout handles <html> and providers.
// This file is required by Next.js but delegates everything to [locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
