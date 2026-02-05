'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { SignalCard, Cluster } from '@/types';
import {
  Network,
  X,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STORAGE_KEY_SIGNALS = 'signal-validator-signals';

export default function ClustersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Data
  const [signals, setSignals] = useState<SignalCard[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  // Controls
  const [selectedField, setSelectedField] = useState('');
  const [includeWeak, setIncludeWeak] = useState(true);

  // UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [user, authLoading, router]);

  // Load signals from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIGNALS);
      if (saved) {
        setSignals(JSON.parse(saved).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })));
      }
    } catch (e) {
      console.error('Failed to load signals:', e);
    }
  }, []);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);

  // Derive unique fields from signals
  const fields = useMemo(() => {
    const fieldSet = new Set(signals.map(s => s.fieldOfInterest).filter(Boolean));
    return Array.from(fieldSet).sort();
  }, [signals]);

  // Filtered signals based on controls
  const filteredSignals = useMemo(() => {
    return signals.filter(s => {
      if (s.qualificationLevel === 'not-a-signal') return false;
      if (!includeWeak && s.qualificationLevel === 'weak') return false;
      if (selectedField && s.fieldOfInterest !== selectedField) return false;
      return true;
    });
  }, [signals, selectedField, includeWeak]);

  // Signals matching the selected cluster
  const clusterSignals = useMemo(() => {
    if (!selectedCluster) return [];
    return signals.filter(s => selectedCluster.signalIds.includes(s.id));
  }, [signals, selectedCluster]);

  // Generate clusters via API
  const generateClusters = useCallback(async () => {
    if (filteredSignals.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setErrorType(null);
    setClusters([]);
    setSelectedCluster(null);

    try {
      const signalsData = filteredSignals.map(s => ({
        id: s.id,
        inputSignal: s.description,
        outcome: s.qualificationLevel,
        signalTypes: s.validationResult?.signalTypes || [],
        reasoning: s.validationResult?.reasoning || []
      }));

      const response = await api.post('/api/signals/cluster', {
        signals: signalsData,
        selectedField: selectedField || 'All fields',
        includeWeak
      });

      // Strip markdown code fences if present
      let rawResponse = (response.data.rawResponse || '') as string;
      rawResponse = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      const parsed = JSON.parse(rawResponse);

      // Validate signal IDs against actual signals
      const validSignalIds = new Set(filteredSignals.map(s => s.id));

      const clustersWithIds: Cluster[] = parsed.map((c: any) => ({
        id: crypto.randomUUID(),
        title: c.title || 'Untitled Cluster',
        insight: c.insight || '',
        strength: ['high', 'medium', 'low'].includes(c.strength) ? c.strength : 'medium',
        signalIds: (c.signalIds || []).filter((id: string) => validSignalIds.has(id)),
        patternTags: c.patternTags || [],
        opportunityPreview: {
          whoIsStruggling: c.opportunityPreview?.whoIsStruggling || '',
          desiredOutcome: c.opportunityPreview?.desiredOutcome || '',
          whatBreaks: c.opportunityPreview?.whatBreaks || '',
          costOfInaction: c.opportunityPreview?.costOfInaction || ''
        }
      }));

      setClusters(clustersWithIds);
      if (clustersWithIds.length > 0) {
        setSelectedCluster(clustersWithIds[0]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to generate clusters';
      if (msg.toLowerCase().includes('rate limit')) {
        setErrorType('rate_limit');
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [filteredSignals, selectedField, includeWeak]);

  // Toggle signal detail expansion
  const toggleSignalExpansion = useCallback((signalId: string) => {
    setExpandedSignals(prev => {
      const next = new Set(prev);
      if (next.has(signalId)) next.delete(signalId);
      else next.add(signalId);
      return next;
    });
  }, []);

  // Rename handlers
  const handleRenameStart = () => {
    if (!selectedCluster) return;
    setRenameValue(selectedCluster.title);
    setIsRenaming(true);
  };

  const handleRenameSave = () => {
    if (!selectedCluster || !renameValue.trim()) {
      setIsRenaming(false);
      return;
    }
    const updated = { ...selectedCluster, title: renameValue.trim() };
    setClusters(prev => prev.map(c => c.id === selectedCluster.id ? updated : c));
    setSelectedCluster(updated);
    setIsRenaming(false);
  };

  // Export cluster as JSON
  const handleExport = () => {
    if (!selectedCluster) return;
    const blob = new Blob([JSON.stringify(selectedCluster, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-${selectedCluster.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helpers
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return strength;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Valid</Badge>;
      case 'weak':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Weak</Badge>;
      case 'not-a-signal':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Not a Signal</Badge>;
      default:
        return null;
    }
  };

  // Auth loading / guard
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="-mx-4 -mt-8 flex" style={{ height: 'calc(100vh - 140px)' }}>
      {/* ── Left Column ── */}
      <div className="w-[35%] flex flex-col border-r border-gray-200 bg-white">

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold">Clusters</h1>
              <p className="text-sm text-gray-500">Grouped patterns from validated signals</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          {/* Field of Interest */}
          <div>
            <label className="text-sm font-medium mb-2 block">Field of Interest</label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="All fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All fields</SelectItem>
                {fields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include Weak Signals toggle */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setIncludeWeak(!includeWeak)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors',
                includeWeak ? 'bg-purple-600' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  includeWeak ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
            <label className="text-sm text-gray-700">Include Weak Signals</label>
          </div>

          {/* Signal count */}
          <p className="text-sm text-gray-500">
            {filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''} available
          </p>

          {/* Error banner */}
          {error && (
            <div className={cn(
              'flex items-start justify-between p-3 rounded-lg border',
              errorType === 'rate_limit' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            )}>
              <p className={cn(
                'text-sm',
                errorType === 'rate_limit' ? 'text-amber-800' : 'text-red-800'
              )}>
                {error}
              </p>
              <button
                onClick={() => { setError(null); setErrorType(null); }}
                className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={generateClusters}
            disabled={isGenerating || filteredSignals.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </span>
            ) : 'Generate Clusters'}
          </Button>
        </div>

        {/* Cluster list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {clusters.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No clusters generated yet. Click &quot;Generate Clusters&quot; to start.
            </p>
          ) : (
            clusters.map(cluster => (
              <div
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster)}
                className={cn(
                  'border rounded-lg p-4 cursor-pointer transition-colors',
                  selectedCluster?.id === cluster.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <p className="font-semibold text-sm">{cluster.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    {cluster.signalIds.length} signal{cluster.signalIds.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('inline-block h-2.5 w-2.5 rounded-full', getStrengthColor(cluster.strength))} />
                    <span className="text-xs text-gray-500">{getStrengthLabel(cluster.strength)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cluster.patternTags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right Column ── */}
      <div className="w-[65%] overflow-y-auto bg-gray-50">
        {!selectedCluster ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Network className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a cluster to view details</p>
            </div>
          </div>
        ) : (
          /* Cluster detail */
          <div className="p-6 space-y-6">

            {/* Header card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                        className="text-2xl font-bold w-full border-b-2 border-purple-400 outline-none bg-transparent"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold">{selectedCluster.title}</h2>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={handleRenameStart}>Rename</Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Metadata row */}
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('inline-block h-2.5 w-2.5 rounded-full', getStrengthColor(selectedCluster.strength))} />
                    <span>Strength: {getStrengthLabel(selectedCluster.strength)}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>Coverage: {clusterSignals.length} / {selectedCluster.signalIds.length} signals</span>
                </div>
              </CardContent>
            </Card>

            {/* Insight card */}
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-6">
                <h3 className="text-xs font-semibold text-purple-700 tracking-wider uppercase mb-2">
                  Cluster Insight
                </h3>
                <p className="text-purple-900">{selectedCluster.insight}</p>
              </CardContent>
            </Card>

            {/* Signals in cluster */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signals in this Cluster</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {clusterSignals.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No matching signals found. The referenced signals may have been deleted.
                  </p>
                ) : (
                  clusterSignals.map(signal => {
                    const isExpanded = expandedSignals.has(signal.id);
                    return (
                      <div key={signal.id} className="border border-gray-200 rounded-lg p-4">
                        {/* Signal header */}
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm text-gray-700', isExpanded ? '' : 'line-clamp-2')}>
                            {signal.description}
                          </p>
                          {getOutcomeBadge(signal.qualificationLevel)}
                        </div>

                        {/* Signal type chips */}
                        {signal.validationResult?.signalTypes && signal.validationResult.signalTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {signal.validationResult.signalTypes.map((type, idx) => (
                              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                {type}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && signal.validationResult && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            {signal.validationResult.reasoning.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Reasoning</p>
                                <ul className="space-y-1">
                                  {signal.validationResult.reasoning.map((point, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex gap-1.5">
                                      <span className="text-indigo-600">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {signal.validationResult.metrics && signal.validationResult.metrics.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Metrics to Track</p>
                                <ul className="space-y-1">
                                  {signal.validationResult.metrics.map((metric, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex gap-1.5">
                                      <span className="text-indigo-600">•</span>
                                      <span>{metric}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expand/collapse toggle */}
                        <button
                          onClick={() => toggleSignalExpansion(signal.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                        >
                          {isExpanded ? 'Hide Details' : 'View Full'}
                        </button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Pattern markers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern Markers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedCluster.patternTags.map((tag, idx) => (
                    <span key={idx} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Opportunity preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Opportunity Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Who is struggling?</p>
                  <p className="text-sm text-gray-700">{selectedCluster.opportunityPreview.whoIsStruggling}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What outcome are they trying to achieve?</p>
                  <p className="text-sm text-gray-700">{selectedCluster.opportunityPreview.desiredOutcome}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What breaks today?</p>
                  <p className="text-sm text-gray-700">{selectedCluster.opportunityPreview.whatBreaks}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cost of inaction (estimated):</p>
                  <p className="text-sm text-gray-700">{selectedCluster.opportunityPreview.costOfInaction}</p>
                </div>

                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={() => setIsConvertModalOpen(true)}
                >
                  Convert to Opportunity
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Convert to Opportunity Modal ── */}
      <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert to Opportunity</DialogTitle>
            <DialogDescription>
              Generate a structured opportunity from this cluster&apos;s insights
            </DialogDescription>
          </DialogHeader>

          {selectedCluster && (
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-800">{selectedCluster.title}</p>
                <p className="text-xs text-purple-600 mt-1">{selectedCluster.insight}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Signals covered:</span>
                  <span className="font-medium">{selectedCluster.signalIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pattern strength:</span>
                  <span className="font-medium capitalize">{selectedCluster.strength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pattern tags:</span>
                  <span className="font-medium">{selectedCluster.patternTags.length}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertModalOpen(false)}>Cancel</Button>
            <Button>Generate Opportunity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
