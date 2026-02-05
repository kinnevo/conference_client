'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { LLMProvider, LLMProviderConfig, LLMTestResult } from '@/types';

export function useLLMProviders() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/llm-providers');
      setProviders(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();

    // Socket.IO real-time updates
    const socket = getSocket();

    socket.on('llm-provider:updated', (provider: LLMProvider) => {
      setProviders(prev =>
        prev.map(p => p.id === provider.id ? provider : p)
      );
    });

    socket.on('llm-provider:activated', (providerId: string) => {
      setProviders(prev =>
        prev.map(p => ({ ...p, is_active: p.id === providerId }))
      );
    });

    return () => {
      socket.off('llm-provider:updated');
      socket.off('llm-provider:activated');
    };
  }, [fetchProviders]);

  async function configureProvider(id: string, config: LLMProviderConfig) {
    try {
      const { data } = await api.post(`/api/llm-providers/${id}/configure`, config);
      setProviders(prev =>
        prev.map(p => p.id === id ? data : p)
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to configure provider');
    }
  }

  async function testProvider(id: string): Promise<LLMTestResult> {
    try {
      const { data } = await api.post(`/api/llm-providers/${id}/test`);
      // Refresh to get updated test results
      await fetchProviders();
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to test provider');
    }
  }

  async function activateProvider(id: string) {
    try {
      const { data } = await api.put(`/api/llm-providers/${id}/activate`);
      const socket = getSocket();
      socket.emit('llm-provider:activated', id);
      setProviders(prev =>
        prev.map(p => ({ ...p, is_active: p.id === id }))
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to activate provider');
    }
  }

  async function getAvailableModels(id: string): Promise<string[]> {
    try {
      const { data } = await api.get(`/api/llm-providers/${id}/models`);
      return data.models;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to get models');
    }
  }

  return {
    providers,
    isLoading,
    error,
    configureProvider,
    testProvider,
    activateProvider,
    getAvailableModels,
    refetch: fetchProviders
  };
}
