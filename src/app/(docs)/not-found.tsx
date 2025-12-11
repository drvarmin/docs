'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { SortedResult } from 'fumadocs-core/search/server';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";

type TaggedResult = SortedResult & { tag?: string };

const getRootSegment = (item: TaggedResult) => {
  if (item.tag) return item.tag;

  const rawPath = (item.url || item.id || '').replace(/^\/+/, '');
  if (!rawPath) return null;

  const pathWithoutQuery = rawPath.split(/[?#]/)[0];
  const parts = pathWithoutQuery.split('/').filter(Boolean);

  if (parts[0] === 'docs') {
    return parts[1] || null;
  }

  return parts[0] || null;
};

const formatResultTitle = (item: TaggedResult) => {
  const title = item.content?.trim() || item.id;
  const rootSegment = getRootSegment(item);

  if (!rootSegment) return title;

  const rootLabel = rootSegment
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return rootLabel ? `${rootLabel}: ${title}` : title;
};

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hashTokens, setHashTokens] = useState('');
  const [results, setResults] = useState<SortedResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

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

  // Normalize path/query/hash into a search-friendly phrase
  const normalizeText = (value: string) =>
    value
      .replace(/^\/docs\/?/, '')
      .replace(/[?#]/g, ' ')
      .replace(/[-/_=+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const pathTokens = useMemo(() => normalizeText(pathname || ''), [pathname]);

  const queryTokens = useMemo(() => {
    if (!searchParams) return '';
    const parts: string[] = [];
    searchParams.forEach((value, key) => {
      parts.push(key, value);
    });
    return normalizeText(parts.join(' '));
  }, [searchParams]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    setHashTokens(hash ? normalizeText(hash.replace(/^#/, '')) : '');
  }, [pathname, searchParams]);

  const normalizedQuery = useMemo(
    () => [pathTokens, queryTokens, hashTokens].filter(Boolean).join(' '),
    [hashTokens, pathTokens, queryTokens],
  );

  const sdkSelection = useMemo(() => {
    const sdks = ['ios', 'android', 'expo', 'flutter', 'react-native'];
    if (!normalizedQuery) {
      return sdks;
    }

    const normalizedQueryLower = normalizedQuery.toLowerCase();
    const tokens = new Set(
      normalizedQueryLower
        .split(/\s+/)
        .filter(Boolean),
    );

    const selected: string[] = [];
    for (const sdk of sdks) {
      // Check if the SDK name (with hyphens converted to spaces) appears in the normalized query
      // This handles cases like 'react-native' matching 'react native' in the normalized query
      const sdkNormalized = sdk.replace(/-/g, ' ');
      if (normalizedQueryLower.includes(sdkNormalized) || tokens.has(sdk)) {
        selected.push(sdk);
      }
    }

    return selected.length > 0
      ? selected
      : sdks;
  }, [normalizedQuery]);

  // Fetch RAG-backed search suggestions matching the current URL
  useEffect(() => {
    if (!normalizedQuery) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const sdkParam = sdkSelection.join(',');
        const response = await fetch(
          `/docs/api/search?query=${encodeURIComponent(normalizedQuery)}&sdk=${encodeURIComponent(sdkParam)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError('Unable to load suggestions right now.');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [normalizedQuery, sdkSelection]);

  const handleAskAI = () => {
    const query = normalizedQuery || pathTokens;
    const searchQuery = query
      ? encodeURIComponent(`help me find a doc that covers this ${query}`)
      : '';
    const destination = searchQuery ? `/ai?search=${searchQuery}` : '/ai';
    router.push(destination);
  };

  return (
    <DocsPage>
      <DocsTitle>Page Not Found</DocsTitle>
      <DocsDescription>We couldn't find the page you're looking for.</DocsDescription>
      <DocsBody>
        <div className="flex">
          <button 
            onClick={handleAskAI}
            className="inline-flex items-center gap-1 px-3 py-2 text-base font-medium transition-colors rounded-lg cursor-pointer transform transition-transform duration-150 hover:opacity-75 opacity-100"
            style={{ 
              backgroundColor: 'rgba(116, 248, 240, 0.15)',
              borderWidth: '1px',
              borderStyle: 'solid', 
              borderColor: 'var(--color-fd-primary)',
              color: 'var(--color-fd-primary)'
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Ask AI: </span>
            <span className="font-normal opacity-75">help me find this page</span>
          </button>
        </div>
        <div className="mt-12 space-y-3">
          <h3>
            Related docs:
          </h3>
          {isLoading && (
            <div className="text-sm text-fd-muted-foreground">
              Searching for possible matches...
            </div>
          )}
          {!isLoading && error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!isLoading && !error && results && results.length > 0 && (
            <ul className="list-disc pl-5 space-y-2">
              {results.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    className="text-fd-foreground hover:underline "
                  >
                    {formatResultTitle(item)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && !error && results && results.length === 0 && (
            <div className="text-sm text-fd-muted-foreground">
              No similar docs found yet.
            </div>
          )}
        </div>
      </DocsBody>
    </DocsPage>
  );
}