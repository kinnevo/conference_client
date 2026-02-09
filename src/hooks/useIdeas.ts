'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface Idea {
  id: string;
  opportunity_id: string;
  user_id: string;
  idea_input: string;
  result: string;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export function useIdeas(options?: { opportunityId?: string | null; enabled?: boolean }) {
  const { opportunityId, enabled = true } = options ?? {};
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    if (!enabled) {
      setIdeas([]);
      setIsLoading(false);
      return;
    }
    try {
      const url = opportunityId
        ? `/api/ideas?opportunityId=${encodeURIComponent(opportunityId)}`
        : '/api/ideas';
      const { data } = await api.get<Idea[]>(url);
      setIdeas(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load ideas');
      setIdeas([]);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, enabled]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const saveIdea = useCallback(
    async (params: { opportunityId: string; ideaInput: string; result: string }) => {
      const { data } = await api.post<Idea>('/api/ideas', {
        opportunityId: params.opportunityId,
        ideaInput: params.ideaInput,
        result: params.result
      });
      setIdeas((prev) => [data, ...prev]);
      return data;
    },
    []
  );

  return {
    ideas,
    isLoading,
    error,
    refetch: fetchIdeas,
    saveIdea
  };
}
