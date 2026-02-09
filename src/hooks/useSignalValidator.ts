'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignalCard, ValidationResult } from '@/types';
import { useAuth } from '@/components/auth-provider';
import api from '@/lib/api';

function getSessionId(): string {
  const storage = getStorage();
  let id = storage.getItem('signal-validator-session-id');
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem('signal-validator-session-id', id);
  }
  return id;
}

type SyncStatus = 'idle' | 'pending' | 'success' | 'error';

const STORAGE_KEY_SIGNALS = 'signal-validator-signals';
const STORAGE_KEY_SESSION = 'signal-validator-session';

/** Use sessionStorage so each tab/session has its own state (no shared memory across sessions). */
function getStorage(): Storage {
  if (typeof window === 'undefined') return null as unknown as Storage;
  return sessionStorage;
}

function isValidResult(r: any): r is ValidationResult {
  return r && r.outcome && Array.isArray(r.reasoning) && Array.isArray(r.signalTypes)
    && Array.isArray(r.metrics) && Array.isArray(r.improvements);
}

interface UseSignalValidatorReturn {
  // Application State
  signals: SignalCard[];
  fieldOfInterest: string;
  description: string;

  // Validation State
  currentValidationResult: ValidationResult | null;
  validationHistory: ValidationResult[];
  historyIndex: number;

  // UI State
  activeSignalId: string | null;
  deleteId: string | null;
  syncStatus: SyncStatus;

  // Actions
  setFieldOfInterest: (field: string) => void;
  setDescription: (desc: string) => void;
  setCurrentValidationResult: (result: ValidationResult | null) => void;
  addToHistory: (result: ValidationResult) => void;
  navigateHistory: (direction: 'prev' | 'next') => void;
  setActiveSignalId: (id: string | null) => void;
  setDeleteId: (id: string | null) => void;
  saveSignal: () => void;
  updateSignal: () => void;
  deleteSignal: (id: string) => void;
  loadSignal: (signal: SignalCard) => void;
  clearForm: () => void;
  refetchSignals: () => Promise<void>;
}

export function useSignalValidator(): UseSignalValidatorReturn {
  const { user } = useAuth();

  // Application State
  const [signals, setSignals] = useState<SignalCard[]>([]);
  const [fieldOfInterest, setFieldOfInterest] = useState('');
  const [description, setDescription] = useState('');

  // Validation State
  const [currentValidationResult, setCurrentValidationResult] = useState<ValidationResult | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI State
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hasRestored, setHasRestored] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Auto-reset sync status after 3 seconds
  useEffect(() => {
    if (syncStatus === 'idle' || syncStatus === 'pending') return;
    const timer = setTimeout(() => setSyncStatus('idle'), 3000);
    return () => clearTimeout(timer);
  }, [syncStatus]);

  // Load signals from server on mount (respects demo/live mode)
  useEffect(() => {
    const loadSignalsFromServer = async () => {
      try {
        // Fetch signals from server (mode header automatically added by api interceptor)
        const { data } = await api.get<any[]>('/api/signals');

        // Convert server signals to SignalCard format
        const serverSignals: SignalCard[] = data.map((s: any) => ({
          id: s.id,
          title: s.title || '',
          description: s.description || '',
          fieldOfInterest: s.field_of_interest || '',
          userId: s.user_id,
          qualificationLevel: s.qualification_level as 'valid' | 'weak' | 'not-a-signal',
          validationResult: s.validation_result,
          createdAt: new Date(s.created_at)
        }));

        setSignals(serverSignals);
      } catch (error) {
        console.error('Failed to load signals from server:', error);

        // Fallback to sessionStorage if server fetch fails
        const storage = getStorage();
        const savedSignals = storage.getItem(STORAGE_KEY_SIGNALS);
        if (savedSignals) {
          try {
            const parsed = JSON.parse(savedSignals);
            setSignals(parsed.map((s: SignalCard) => ({
              ...s,
              createdAt: new Date(s.createdAt)
            })));
          } catch (e) {
            console.error('Failed to parse saved signals:', e);
          }
        }
      }

      // Restore session state from sessionStorage
      const storage = getStorage();
      const savedSession = storage.getItem(STORAGE_KEY_SESSION);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session.fieldOfInterest) setFieldOfInterest(session.fieldOfInterest);
          if (session.description) setDescription(session.description);
          if (session.activeSignalId) setActiveSignalId(session.activeSignalId);
          if (isValidResult(session.currentValidationResult)) {
            setCurrentValidationResult(session.currentValidationResult);
          }
        } catch (e) {
          storage.removeItem(STORAGE_KEY_SESSION);
        }
      }

      setHasRestored(true);
    };

    loadSignalsFromServer();
  }, []);

  // Save signals to sessionStorage when they change (per-tab)
  useEffect(() => {
    if (!hasRestored) return;
    getStorage().setItem(STORAGE_KEY_SIGNALS, JSON.stringify(signals));
  }, [hasRestored, signals]);

  // Save session state to sessionStorage when it changes (per-tab)
  useEffect(() => {
    if (!hasRestored) return;
    getStorage().setItem(STORAGE_KEY_SESSION, JSON.stringify({
      fieldOfInterest,
      description,
      activeSignalId,
      currentValidationResult
    }));
  }, [hasRestored, fieldOfInterest, description, activeSignalId, currentValidationResult]);

  const addToHistory = useCallback((result: ValidationResult) => {
    setValidationHistory(prev => {
      const newHistory = [...prev, result];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    setCurrentValidationResult(result);
  }, []);

  const navigateHistory = useCallback((direction: 'prev' | 'next') => {
    setHistoryIndex(prev => {
      const newIndex = direction === 'prev' ? Math.max(0, prev - 1) : Math.min(validationHistory.length - 1, prev + 1);
      setCurrentValidationResult(validationHistory[newIndex]);
      return newIndex;
    });
  }, [validationHistory]);

  const saveSignal = useCallback(() => {
    if (!currentValidationResult || !user) return;

    const newId = crypto.randomUUID();
    const title = description.split(' ').slice(0, 6).join(' ') + '...';

    const newSignal: SignalCard = {
      id: newId,
      title,
      description,
      fieldOfInterest,
      userId: user.id,
      qualificationLevel: currentValidationResult.outcome,
      validationResult: currentValidationResult,
      createdAt: new Date()
    };

    setSignals(prev => [newSignal, ...prev]);
    setActiveSignalId(newId);

    // Persist to DB with status feedback
    setSyncStatus('pending');
    api.post('/api/signals', {
      id: newId,
      sessionId: getSessionId(),
      fieldOfInterest,
      title,
      description,
      qualificationLevel: currentValidationResult.outcome,
      validationResult: currentValidationResult
    })
      .then(() => setSyncStatus('success'))
      .catch((error) => {
        console.error('Save signal failed:', error.response?.data || error.message);
        setSyncStatus('error');
      });
  }, [currentValidationResult, description, fieldOfInterest, user]);

  const updateSignal = useCallback(() => {
    if (!activeSignalId || !currentValidationResult) return;

    const title = description.split(' ').slice(0, 6).join(' ') + '...';

    setSignals(prev => prev.map(signal =>
      signal.id === activeSignalId
        ? {
            ...signal,
            title,
            description,
            fieldOfInterest,
            qualificationLevel: currentValidationResult.outcome,
            validationResult: currentValidationResult
          }
        : signal
    ));

    // Persist to DB with status feedback
    setSyncStatus('pending');
    api.post('/api/signals', {
      id: activeSignalId,
      sessionId: getSessionId(),
      fieldOfInterest,
      title,
      description,
      qualificationLevel: currentValidationResult.outcome,
      validationResult: currentValidationResult
    })
      .then(() => setSyncStatus('success'))
      .catch((error) => {
        console.error('Update signal failed:', error.response?.data || error.message);
        setSyncStatus('error');
      });
  }, [activeSignalId, currentValidationResult, description, fieldOfInterest]);

  const deleteSignal = useCallback((id: string) => {
    setSignals(prev => prev.filter(signal => signal.id !== id));
    if (activeSignalId === id) {
      clearForm();
    }
    setDeleteId(null);

    // Delete from DB with status feedback
    setSyncStatus('pending');
    api.delete(`/api/signals/${id}`)
      .then(() => setSyncStatus('success'))
      .catch((error) => {
        console.error('Delete signal failed:', error.response?.data || error.message);
        setSyncStatus('error');
      });
  }, [activeSignalId]);

  const loadSignal = useCallback((signal: SignalCard) => {
    setActiveSignalId(signal.id);
    setFieldOfInterest(signal.fieldOfInterest);
    setDescription(signal.description);
    setCurrentValidationResult(isValidResult(signal.validationResult) ? signal.validationResult : null);
  }, []);

  const clearForm = useCallback(() => {
    setActiveSignalId(null);
    setFieldOfInterest('');
    setDescription('');
    setCurrentValidationResult(null);
    setValidationHistory([]);
    setHistoryIndex(0);
  }, []);

  const refetchSignals = useCallback(async () => {
    try {
      const { data } = await api.get<any[]>('/api/signals');
      const serverSignals: SignalCard[] = data.map((s: any) => ({
        id: s.id,
        title: s.title || '',
        description: s.description || '',
        fieldOfInterest: s.field_of_interest || '',
        userId: s.user_id,
        qualificationLevel: s.qualification_level as 'valid' | 'weak' | 'not-a-signal',
        validationResult: s.validation_result,
        createdAt: new Date(s.created_at)
      }));
      setSignals(serverSignals);
    } catch (error) {
      console.error('Failed to refetch signals:', error);
    }
  }, []);

  return {
    // Application State
    signals,
    fieldOfInterest,
    description,

    // Validation State
    currentValidationResult,
    validationHistory,
    historyIndex,

    // UI State
    activeSignalId,
    deleteId,
    syncStatus,

    // Actions
    setFieldOfInterest,
    setDescription,
    setCurrentValidationResult,
    addToHistory,
    navigateHistory,
    setActiveSignalId,
    setDeleteId,
    saveSignal,
    updateSignal,
    deleteSignal,
    loadSignal,
    clearForm,
    refetchSignals
  };
}
