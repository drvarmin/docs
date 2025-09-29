'use client';

import AskAI from "@/components/AskAI";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AIPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initialQuery, setInitialQuery] = useState<string | null>(null);

  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      try {
        const decoded = decodeURIComponent(searchQuery);
        setInitialQuery(decoded);
        // Clear the URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        router.replace(url.pathname + url.search, { scroll: false });
      } catch {
        // Fail silently if malformed
      }
    }
  }, [searchParams, router]);

  return <AskAI initialQuery={initialQuery} />;
}