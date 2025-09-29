'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  

  // Wait for auth session to resolve, then report once per navigation
  useEffect(() => {
    const fetchSessionAndReport404 = async () => {
      try {
        // Fetch user session first
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        const email = data.isLoggedIn && data.userInfo?.email ? data.userInfo.email : undefined;

        await fetch('/docs/api/404-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: window.location.href,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            email,
          }),
        });
      } catch (error) {
        console.warn('Failed to fetch session or report 404:', error);
      }
    };

    fetchSessionAndReport404();
  }, [pathname]);

  const handleAskAI = () => {
    // Extract path segments and convert to search query
    // e.g., /docs/using-superwall-events-tracking -> "using superwall events tracking"
    const pathSegments = pathname
      .replace('/docs/', '')
      .split('/')
      .filter(Boolean)
      .join(' ')
      .replace(/-/g, ' ');
    
    const searchQuery = encodeURIComponent(pathSegments);
    router.push(`/docs/ai?search=${searchQuery}`);
  };

  return (
    <DocsPage>
      <DocsTitle>Page Not Found</DocsTitle>
      <DocsDescription>We couldn't find the page you're looking for. Click Ask AI to search the docs for you.</DocsDescription>
      <DocsBody>
        <div className="flex">
          <button 
            onClick={handleAskAI}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium transition-colors rounded-lg cursor-pointer"
            style={{ 
              backgroundColor: 'rgba(116, 248, 240, 0.15)',
              borderWidth: '1px',
              borderStyle: 'solid', 
              borderColor: 'var(--color-fd-primary)',
              color: 'var(--color-fd-primary)'
            }}
          >
            <Sparkles className="w-5 h-5" />
            Ask AI
          </button>
        </div>
      </DocsBody>
    </DocsPage>
  );
}