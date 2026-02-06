'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Cluster } from '@/types';

export interface ClusterRow {
  id: string;
  title: string;
  insight: string;
  strength: string;
  signal_ids: string[];
  pattern_tags: string[];
  opportunity_preview: {
    whoIsStruggling?: string;
    desiredOutcome?: string;
    whatBreaks?: string;
    costOfInaction?: string;
  };
  signal_snapshots: Array<{
    id: string;
    description?: string;
    qualificationLevel?: string;
    signalTypes?: string[];
    reasoning?: string[];
    metrics?: string[];
  }>;
  created_at: string;
  updated_at: string;
}

function toCluster(row: ClusterRow): Cluster & { signalSnapshots?: ClusterRow['signal_snapshots'] } {
  return {
    id: row.id,
    title: row.title,
    insight: row.insight || '',
    strength: (['high', 'medium', 'low'].includes(row.strength) ? row.strength : 'medium') as Cluster['strength'],
    signalIds: row.signal_ids || [],
    patternTags: row.pattern_tags || [],
    opportunityPreview: {
      whoIsStruggling: row.opportunity_preview?.whoIsStruggling || '',
      desiredOutcome: row.opportunity_preview?.desiredOutcome || '',
      whatBreaks: row.opportunity_preview?.whatBreaks || '',
      costOfInaction: row.opportunity_preview?.costOfInaction || ''
    },
    signalSnapshots: row.signal_snapshots || []
  };
}

export function useClusters() {
  const [clusters, setClusters] = useState<(Cluster & { signalSnapshots?: ClusterRow['signal_snapshots'] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<ClusterRow[]>('/api/clusters');
      setClusters((data || []).map(toCluster));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load clusters');
      setClusters([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const saveClusters = useCallback(async (items: (Cluster & { signalSnapshots?: any[] })[]): Promise<boolean> => {
    const payload = items.map(c => ({
      id: c.id,
      title: c.title,
      insight: c.insight,
      strength: c.strength,
      signalIds: c.signalIds,
      patternTags: c.patternTags,
      opportunityPreview: c.opportunityPreview,
      signalSnapshots: c.signalSnapshots || []
    }));
    await api.post('/api/clusters', { clusters: payload });
    await fetchClusters();
    return true;
  }, [fetchClusters]);

  const updateClusterTitle = useCallback(async (id: string, title: string): Promise<boolean> => {
    try {
      await api.patch(`/api/clusters/${id}`, { title });
      setClusters(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update cluster');
      return false;
    }
  }, []);

  return {
    clusters,
    isLoading,
    error,
    refetch: fetchClusters,
    saveClusters,
    updateClusterTitle
  };
}
