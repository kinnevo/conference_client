'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface Opportunity {
  id: string;
  cluster_id: string | null;
  title: string;
  content: string;
  user_request: string | null;
  created_at: string;
  updated_at: string;
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    try {
      const { data } = await api.get<Opportunity[]>('/api/opportunities');
      setOpportunities(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load opportunities');
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return {
    opportunities,
    isLoading,
    error,
    refetch: fetchOpportunities
  };
}
