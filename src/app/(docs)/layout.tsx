import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';
import { getSidebarTabs } from 'fumadocs-ui/utils/get-sidebar-tabs';
import type { SidebarTab } from 'fumadocs-ui/utils/get-sidebar-tabs';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout 
      tabMode="sidebar"
      tree={source.pageTree}
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: 'top'
      }}
    >
    {children}
  </DocsLayout>
  );
}
