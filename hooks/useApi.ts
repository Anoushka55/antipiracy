'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!path) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await api<T>(path);
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
