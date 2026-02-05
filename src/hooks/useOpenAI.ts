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

      // Parse the structured response
      const result = parseValidationResponse(rawResponse);

      console.log('Parsed Result:', result);

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
  console.log('Parsing response...');

  // Extract original input
  const originalInputMatch = response.match(/ORIGINAL INPUT:\s*<<<\s*([\s\S]*?)\s*>>>/);
  const originalInput = originalInputMatch ? originalInputMatch[1].trim() : '';
  console.log('Original Input:', originalInput);

  // Extract outcome
  const outcomeMatch = response.match(/OUTCOME:\s*(\w+[-\w]*)/);
  const outcome = (outcomeMatch?.[1] || 'weak') as QualificationLevel;
  console.log('Outcome:', outcome);

  // Extract signal types
  const signalTypesMatch = response.match(/SIGNAL TYPES:\s*(.+)/);
  const signalTypes = signalTypesMatch
    ? signalTypesMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Extract reasoning (bullet points)
  const reasoningSection = response.match(/REASONING:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const reasoning = reasoningSection
    ? reasoningSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
    : [];

  // Extract clarification
  const clarificationMatch = response.match(/CLARIFICATION NEEDED:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const clarification = clarificationMatch ? clarificationMatch[1].trim() : '';

  // Extract metrics (bullet points)
  const metricsSection = response.match(/METRICS TO TRACK:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const metrics = metricsSection
    ? metricsSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
    : [];

  // Extract improvements (numbered list)
  const improvementsSection = response.match(/HOW TO IMPROVE:\s*([\s\S]*?)(?=\n\n[A-Z])/);
  const improvements = improvementsSection
    ? improvementsSection[1]
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.trim().replace(/^\d+\.\s*/, ''))
    : [];

  // Extract improved version
  const improvedVersionMatch = response.match(/IMPROVED VERSION:\s*([\s\S]*?)$/);
  const improvedVersion = improvedVersionMatch ? improvedVersionMatch[1].trim() : '';

  return {
    originalInput,
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
