import type { ReactNode } from 'react';
import { Sparkles, Book, HelpCircle } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="fixed flex flex-col top-(--fd-banner-height) left-0 right-(--removed-body-scroll-bar-size,0) z-10 px-(--fd-layout-offset) h-(--fd-nav-height) backdrop-blur-sm transition-colors bg-fd-background/80 border-b on-root:[--fd-nav-height:56px] md:on-root:[--fd-nav-height:64px]">
        <div className="mx-auto flex w-full max-w-4xl px-4 gap-2 flex-1 md:px-6 ps-7">
          <div className="items-center flex flex-1 gap-3">
            <a className="inline-flex items-center gap-2.5 font-semibold" href="/">
              <img width="150" alt="Superwall" src="/docs/resources/logo.svg" />
            </a>
            <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-muted/40 px-2 py-1 text-xs font-medium text-fd-primary whitespace-nowrap">
              <Sparkles className="size-3 text-fd-primary" />
              Ask AI
            </span>
          </div>
          <div className="flex flex-1 items-center justify-end md:gap-2">
            <div className="flex items-center gap-4 md:gap-6">
              <a
                className="inline-flex items-center gap-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary"
                data-active="false"
                href="/docs"
              >
                <Book className="size-4 md:hidden" aria-hidden />
                <span className="hidden md:inline">Docs</span>
              </a>
              <a
                className="inline-flex items-center gap-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary"
                data-active="false"
                href="/support"
              >
                <HelpCircle className="size-4 md:hidden" aria-hidden />
                <span className="hidden md:inline">Support</span>
              </a>
            </div>
          </div>
        </div>
      </header>
      <div className="pt-[var(--fd-nav-height,56px)] md:pt-[var(--fd-nav-height,64px)]">
      {children}
      </div>
    </>
  );
}