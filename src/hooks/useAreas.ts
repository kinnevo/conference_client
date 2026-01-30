'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Area } from '@/types';

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/areas');
      setAreas(data.sort((a: Area, b: Area) => a.name.localeCompare(b.name)));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load areas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();

    // Socket.IO real-time updates
    const socket = getSocket();

    socket.on('area:created', (area: Area) => {
      setAreas(prev => [...prev, area].sort((a, b) => a.name.localeCompare(b.name)));
    });

    socket.on('area:updated', (area: Area) => {
      setAreas(prev =>
        prev.map(a => a.id === area.id ? area : a)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    socket.on('area:deleted', (areaId: string) => {
      setAreas(prev => prev.filter(a => a.id !== areaId));
    });

    return () => {
      socket.off('area:created');
      socket.off('area:updated');
      socket.off('area:deleted');
    };
  }, [fetchAreas]);

  async function createArea(name: string) {
    try {
      const { data } = await api.post('/api/areas', { name });
      const socket = getSocket();
      socket.emit('area:created', data);
      setAreas(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create area');
    }
  }

  async function updateArea(id: string, name: string) {
    try {
      const { data } = await api.put(`/api/areas/${id}`, { name });
      const socket = getSocket();
      socket.emit('area:updated', data);
      setAreas(prev =>
        prev.map(a => a.id === id ? data : a)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update area');
    }
  }

  async function deleteArea(id: string) {
    try {
      await api.delete(`/api/areas/${id}`);
      const socket = getSocket();
      socket.emit('area:deleted', id);
      setAreas(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to delete area');
    }
  }

  return {
    areas,
    isLoading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refetch: fetchAreas
  };
}
