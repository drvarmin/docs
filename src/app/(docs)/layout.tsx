import type { ReactNode } from 'react';
import { DocsLayoutWithDiscord } from '@/components/DocsLayoutWithDiscord';
import { source } from '@/lib/source';
import { getSidebarTabsFromOptions } from 'fumadocs-ui/layouts/docs';

export default function Layout({ children }: { children: ReactNode }) {
  const tabs = getSidebarTabsFromOptions(undefined, source.pageTree) ?? [];

  return (
    <DocsLayoutWithDiscord pageTree={source.pageTree} tabs={tabs}>
      {children}
    </DocsLayoutWithDiscord>
  );
}
