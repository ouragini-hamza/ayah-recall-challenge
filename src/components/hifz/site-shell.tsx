import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useStrings } from "@/lib/i18n";
import { StarMark } from "./star-mark";

const NAV = [
  { to: "/", key: "practice" },
  { to: "/history", key: "history" },
  { to: "/about", key: "about" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const t = useStrings();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-soft"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <StarMark className="size-7 shrink-0 text-gold sm:size-8 transition-transform duration-500 group-hover:rotate-45" />
            <span className="flex flex-col leading-none">
              <span className="whitespace-nowrap font-display text-lg font-semibold text-primary-deep sm:text-xl">{t.app.name}</span>
              <span lang="ar" dir="rtl" className="font-arabic text-sm text-muted-foreground">
                {t.app.subtitleAr}
              </span>
            </span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:px-4"
              >
                {t.nav[item.key]}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{t.app.disclaimer}</span>
          <Link to="/about" className="underline-offset-4 hover:text-foreground hover:underline">
            {t.footer.source}
          </Link>
        </div>
      </footer>
    </div>
  );
}
