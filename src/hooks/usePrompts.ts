'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Prompt } from '@/types';

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/prompts');
      setPrompts(data.sort((a: Prompt, b: Prompt) => a.name.localeCompare(b.name)));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  async function updatePrompt(id: string, content: string): Promise<Prompt> {
    try {
      const { data } = await api.put(`/api/prompts/${id}`, { content });
      setPrompts(prev =>
        prev.map(p => p.id === id ? data : p)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update prompt');
    }
  }

  return {
    prompts,
    isLoading,
    error,
    updatePrompt,
    refetch: fetchPrompts
  };
}
