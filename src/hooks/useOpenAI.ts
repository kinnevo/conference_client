'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { ValidationResult, QualificationLevel } from '@/types';

interface UseOpenAIReturn {
  validateSignal: (signalCandidate: string, fieldOfInterest: string) => Promise<ValidationResult>;
  isLoading: boolean;
  error: string | null;
}

export function useOpenAI(): UseOpenAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSignal = async (
    signalCandidate: string,
    fieldOfInterest: string
  ): Promise<ValidationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/signals/validate', {
        signalCandidate,
        fieldOfInterest
      });

      const rawResponse = response.data.rawResponse;

      console.log('Raw OpenAI Response:', rawResponse);

      const result = parseValidationResponse(rawResponse);
      // originalInput is always the text the user submitted — don't rely on AI echoing it
      result.originalInput = signalCandidate;

      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to validate signal';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    validateSignal,
    isLoading,
    error
  };
}

function parseValidationResponse(response: string): ValidationResult {
  // Strip markdown code fences if present
  const cleaned = response.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

  // Try JSON parse first (primary path — matches current prompt)
  try {
    const json = JSON.parse(cleaned);
    const validOutcomes: QualificationLevel[] = ['valid', 'weak', 'not-a-signal'];
    return {
      originalInput: json.originalInput || '',
      outcome: (validOutcomes.includes(json.outcome) ? json.outcome : 'weak') as QualificationLevel,
      reasoning: Array.isArray(json.reasoning) ? json.reasoning : [],
      signalTypes: Array.isArray(json.signalTypes) ? json.signalTypes : [],
      clarification: json.clarification || '',
      metrics: Array.isArray(json.metrics) ? json.metrics : [],
      improvements: Array.isArray(json.improvements) ? json.improvements : [],
      improvedVersion: json.improvedVersion || '',
      rawResponse: response
    };
  } catch {
    // Not JSON — fall back to section-header regex parsing
  }

  // Regex fallback for plain-text section format
  const outcomeMatch = response.match(/OUTCOME:\s*(\w+[-\w]*)/);
  const outcome = (outcomeMatch?.[1] || 'weak') as QualificationLevel;

  const signalTypesMatch = response.match(/SIGNAL TYPES:\s*(.+)/);
  const signalTypes = signalTypesMatch
    ? signalTypesMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const reasoningSection = response.match(/REASONING:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const reasoning = reasoningSection
    ? reasoningSection[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().substring(1).trim())
    : [];

  const clarificationMatch = response.match(/CLARIFICATION NEEDED:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const clarification = clarificationMatch ? clarificationMatch[1].trim() : '';

  const metricsSection = response.match(/METRICS TO TRACK:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const metrics = metricsSection
    ? metricsSection[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().substring(1).trim())
    : [];

  const improvementsSection = response.match(/HOW TO IMPROVE:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const improvements = improvementsSection
    ? improvementsSection[1].split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.trim().replace(/^\d+\.\s*/, ''))
    : [];

  const improvedVersionMatch = response.match(/IMPROVED VERSION:\s*([\s\S]*?)$/);
  const improvedVersion = improvedVersionMatch ? improvedVersionMatch[1].trim() : '';

  const originalInputMatch = response.match(/ORIGINAL INPUT:\s*<<<\s*([\s\S]*?)\s*>>>/);

  return {
    originalInput: originalInputMatch ? originalInputMatch[1].trim() : '',
    outcome,
    reasoning,
    signalTypes,
    clarification,
    metrics,
    improvements,
    improvedVersion,
    rawResponse: response
  };
}
