'use client';

import { useState, useEffect } from 'react';
import { getDiscordInfo, type DiscordInfo } from '@/lib/discord';

export function useDiscordInfo() {
  const [discordInfo, setDiscordInfo] = useState<DiscordInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchDiscordInfo = async () => {
      setLoading(true);
      try {
        const info = await getDiscordInfo();
        if (mounted) {
          setDiscordInfo(info);
        }
      } catch (error) {
        console.error('Failed to fetch Discord info:', error);
        if (mounted) {
          setDiscordInfo(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDiscordInfo();

    return () => {
      mounted = false;
    };
  }, []);

  return { discordInfo, loading };
}