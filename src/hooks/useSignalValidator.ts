'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignalCard, ValidationResult } from '@/types';
import { useAuth } from '@/components/auth-provider';

const STORAGE_KEY_SIGNALS = 'signal-validator-signals';
const STORAGE_KEY_SESSION = 'signal-validator-session';

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

  // Load from localStorage on mount
  useEffect(() => {
    const savedSignals = localStorage.getItem(STORAGE_KEY_SIGNALS);
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

    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
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
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    }

    setHasRestored(true);
  }, []);

  // Save signals to localStorage when they change
  useEffect(() => {
    if (!hasRestored) return;
    localStorage.setItem(STORAGE_KEY_SIGNALS, JSON.stringify(signals));
  }, [hasRestored, signals]);

  // Save session state to localStorage when it changes
  useEffect(() => {
    if (!hasRestored) return;
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
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
  }, [currentValidationResult, description, fieldOfInterest, user]);

  const updateSignal = useCallback(() => {
    if (!activeSignalId || !currentValidationResult) return;

    setSignals(prev => prev.map(signal =>
      signal.id === activeSignalId
        ? {
            ...signal,
            title: description.split(' ').slice(0, 6).join(' ') + '...',
            description,
            fieldOfInterest,
            qualificationLevel: currentValidationResult.outcome,
            validationResult: currentValidationResult
          }
        : signal
    ));
  }, [activeSignalId, currentValidationResult, description, fieldOfInterest]);

  const deleteSignal = useCallback((id: string) => {
    setSignals(prev => prev.filter(signal => signal.id !== id));
    if (activeSignalId === id) {
      clearForm();
    }
    setDeleteId(null);
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
    clearForm
  };
}
