'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Cluster } from '@/types';

export interface SignalRow {
  id: string;
  user_id: string;
  session_id: string | null;
  field_of_interest: string | null;
  title: string | null;
  description: string | null;
  qualification_level: 'valid' | 'weak' | 'not-a-signal' | null;
  validation_result: any;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function useSignals(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<SignalRow[]>('/api/signals');
      setSignals(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load signals');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setSignals([]);
      return;
    }
    fetchSignals();
  }, [enabled, fetchSignals]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(signals.map(s => s.id)));
  }, [signals]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSignal = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/signals/${id}`);
      setSignals(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete signal');
    }
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ['ID', 'User', 'Email', 'Session', 'Field', 'Title', 'Description', 'Qualification', 'Created At'];
    const rows = signals.map(s => [
      s.id,
      [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
      s.email || '',
      s.session_id || '',
      s.field_of_interest || '',
      s.title || '',
      s.description || '',
      s.qualification_level || '',
      s.created_at
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signals.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [signals]);

  const generateClusters = useCallback(async () => {
    const selected = signals.filter(s => selectedIds.has(s.id));
    if (selected.length === 0) return;

    setIsGenerating(true);
    setClusterError(null);
    setClusters([]);

    try {
      const payload = selected.map(s => ({
        id: s.id,
        inputSignal: s.description || '',
        outcome: s.qualification_level || '',
        signalTypes: s.validation_result?.signalTypes || [],
        reasoning: s.validation_result?.reasoning || []
      }));

      const { data } = await api.post<{ rawResponse?: string; model?: string }>('/api/signals/cluster', {
        signals: payload,
        selectedField: null,
        includeWeak: true
      });

      let raw: string = typeof data?.rawResponse === 'string' ? data.rawResponse : '';
      if (!raw.trim()) {
        setClusterError('Server returned no cluster data. Check that an LLM provider is configured and active.');
        return;
      }

      // Strip markdown code fences and leading/trailing text
      raw = raw
        .replace(/^[\s\S]*?```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim();
      const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) raw = jsonMatch[0];

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr: any) {
        setClusterError('Could not parse cluster response. The model may have returned invalid JSON.');
        return;
      }

      const arr = Array.isArray(parsed) ? parsed : (parsed as any)?.clusters;
      const list = Array.isArray(arr) ? arr : [];
      const validIds = new Set(selected.map(s => s.id));

      const clusters: Cluster[] = list.map((c: any, i: number) => ({
        id: c.id || `cluster-${i}`,
        title: c.title || 'Untitled Cluster',
        insight: c.insight || '',
        strength: ['high', 'medium', 'low'].includes(c.strength) ? c.strength : 'medium',
        signalIds: (c.signalIds || []).filter((id: string) => validIds.has(id)),
        patternTags: c.patternTags || [],
        opportunityPreview: c.opportunityPreview || {
          whoIsStruggling: '',
          desiredOutcome: '',
          whatBreaks: '',
          costOfInaction: ''
        }
      }));

      setClusters(clusters);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to generate clusters';
      setClusterError(typeof msg === 'string' ? msg : 'Failed to generate clusters');
    } finally {
      setIsGenerating(false);
    }
  }, [signals, selectedIds]);

  return {
    signals,
    isLoading,
    error,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    deleteSignal,
    exportCSV,
    clusters,
    isGenerating,
    clusterError,
    generateClusters,
    refetch: fetchSignals
  };
}
