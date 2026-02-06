'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useOpportunities, type Opportunity } from '@/hooks/useOpportunities';
import { useIdeas } from '@/hooks/useIdeas';
import { Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

/** Try to parse opportunity content as JSON (object or first element of array). */
function parseContentAsJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return typeof first === 'object' && first !== null && !Array.isArray(first) ? (first as Record<string, unknown>) : null;
    }
    return !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Get a single object from content (for display). Handles both object and array. */
function getContentObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return typeof first === 'object' && first !== null && !Array.isArray(first) ? (first as Record<string, unknown>) : null;
    }
    return !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Get human-readable summary for card (never show raw JSON). */
function getCoreConcept(content: string): string {
  const obj = getContentObject(content);
  if (obj) {
    const title = (obj.opportunityTitle ?? obj.clusterTitle ?? obj.title ?? obj.coreConcept ?? obj.core_concept ?? obj.coreconcept ?? obj.summary ?? obj.description) as string | undefined;
    if (typeof title === 'string' && title.trim()) return title.trim();
    const reasoning = obj.reasoning as string[] | undefined;
    if (Array.isArray(reasoning) && reasoning.length > 0 && typeof reasoning[0] === 'string') {
      const line = reasoning[0].trim();
      return line.length > 150 ? line.slice(0, 150).trim() + '…' : line;
    }
    const outcome = obj.outcome as string | undefined;
    if (typeof outcome === 'string') {
      return `Outcome: ${outcome}`;
    }
    const keys = Object.keys(obj).slice(0, 2);
    const parts = keys.map((k) => `${labelForKey(k)}: ${String((obj as any)[k]).slice(0, 50)}`);
    return parts.join(' · ') || 'Opportunity';
  }
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    return 'Opportunity (open to view)';
  }
  return content.length > 150 ? content.slice(0, 150).trim() + '…' : content;
}

/** Human-readable label for a key. */
function labelForKey(key: string): string {
  const labels: Record<string, string> = {
    title: 'Title',
    clusterTitle: 'Cluster title',
    opportunityTitle: 'Opportunity title',
    coreConcept: 'Core concept',
    core_concept: 'Core concept',
    summary: 'Summary',
    outcome: 'Outcome',
    reasoning: 'Reasoning',
    whoIsStruggling: 'Who is struggling',
    desiredOutcome: 'Desired outcome',
    whatBreaks: 'What breaks today',
    costOfInaction: 'Cost of inaction',
    opportunity: 'Opportunity',
    description: 'Description',
    insights: 'Insights',
    recommendations: 'Recommendations',
    nextSteps: 'Next steps',
    score: 'Score',
    scoring: 'Scoring'
  };
  return labels[key] ?? key.replace(/([A-Z_])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

/** Render a value for display — human-readable, no raw JSON. */
function renderValue(value: unknown): ReactNode {
  if (value == null) return '—';
  if (typeof value === 'string') return <span className="whitespace-pre-wrap">{value}</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-800">
        {value.map((item, i) => (
          <li key={i}>
            {typeof item === 'object' && item !== null
              ? (Array.isArray(item) ? item.join(', ') : Object.values(item as Record<string, unknown>).join(' — '))
              : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-2 mt-1 text-gray-800">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium text-gray-600">{labelForKey(k)}: </span>
            {typeof v === 'string' ? v : Array.isArray(v) ? v.map((x, i) => <span key={i}>{String(x)}{i < v.length - 1 ? '; ' : ''}</span>) : typeof v === 'object' && v !== null ? (
          <span className="text-gray-700">{Object.entries(v as Record<string, unknown>).map(([kk, vv]) => `${labelForKey(kk)}: ${typeof vv === 'string' ? vv : Array.isArray(vv) ? vv.join(', ') : String(vv)}`).join(' · ')}</span>
        ) : String(v)}
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

/** Render full content as human-readable (from JSON). */
function renderContentHumanReadable(content: string): ReactNode {
  const parsed = getContentObject(content);
  if (parsed) {
    return (
      <div className="space-y-4 text-sm text-gray-800">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key}>
            <h4 className="font-semibold text-gray-700 mb-1">{labelForKey(key)}</h4>
            <div className="text-gray-800">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-gray-800 whitespace-pre-wrap">{content}</p>;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { opportunities, isLoading, error } = useOpportunities();
  const { saveIdea } = useIdeas({ enabled: false });
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [ideaInput, setIdeaInput] = useState('');
  const [ideaAiResult, setIdeaAiResult] = useState('');
  const [ideaError, setIdeaError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isSavingIdea, setIsSavingIdea] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Opportunities</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Opportunities
          </CardTitle>
          <CardDescription>
            All opportunities created from clusters. Double-click a card to view full content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
          )}
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading opportunities...</p>
          ) : opportunities.length === 0 ? (
            <p className="text-sm text-gray-500">No opportunities yet. Create one from the Clusters page by converting a cluster to an opportunity.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((opp) => (
                <Card
                  key={opp.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer transition-colors hover:border-primary hover:bg-gray-50',
                    selectedOpportunity?.id === opp.id && 'border-primary ring-2 ring-primary/20'
                  )}
                  onDoubleClick={() => setSelectedOpportunity(opp)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedOpportunity(opp)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{opp.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(opp.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3">{getCoreConcept(opp.content)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen opportunity popup (double-click): left = opportunity info, right = idea input, bottom = AI result */}
      <Dialog
        open={!!selectedOpportunity}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOpportunity(null);
            setIdeaInput('');
            setIdeaAiResult('');
            setIdeaError('');
          }
        }}
      >
        <DialogContent className="fixed left-0 top-0 z-50 max-w-none w-screen h-screen translate-x-0 translate-y-0 rounded-none flex flex-col gap-0 p-0 data-[state=open]:slide-in-from-none data-[state=closed]:slide-out-to-none">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle>{selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              Created {selectedOpportunity ? new Date(selectedOpportunity.created_at).toLocaleString() : ''}. Generate ideas with AI on the right; result appears below. Save idea stores your input and AI result.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0 p-6 overflow-hidden">
            {/* Left: opportunity information (human-readable from JSON) */}
            {selectedOpportunity && (
              <div className="flex flex-col gap-4 overflow-y-auto pr-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-800">{selectedOpportunity.title}</p>
                  {selectedOpportunity.user_request && (
                    <p className="text-xs text-purple-600 mt-1 whitespace-pre-wrap">{selectedOpportunity.user_request}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Opportunity content</h4>
                  <div className="bg-gray-50 p-4 rounded border text-sm">
                    {renderContentHumanReadable(selectedOpportunity.content)}
                  </div>
                </div>
              </div>
            )}

            {/* Right: input to generate ideas with AI */}
            <div className="flex flex-col gap-2 overflow-hidden">
              <label className="text-sm font-medium">Your idea or request for AI</label>
              <Textarea
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="Describe what ideas you want to generate from this opportunity..."
                className="min-h-[120px] resize-y flex-1"
                disabled={isGeneratingIdea}
              />
              <Button
                onClick={async () => {
                  if (!selectedOpportunity) return;
                  setIsGeneratingIdea(true);
                  setIdeaError('');
                  setIdeaAiResult('');
                  try {
                    const contentSummary = getContentObject(selectedOpportunity.content)
                      ? getCoreConcept(selectedOpportunity.content)
                      : selectedOpportunity.content.slice(0, 2000);
                    const { data } = await api.post<{ rawResponse: string }>('/api/ideas/generate', {
                      opportunityTitle: selectedOpportunity.title,
                      opportunityContentSummary: contentSummary,
                      userMessage: ideaInput || undefined
                    });
                    setIdeaAiResult(data.rawResponse || '');
                  } catch (err: any) {
                    setIdeaError(err.response?.data?.error || err.message || 'Failed to generate');
                  } finally {
                    setIsGeneratingIdea(false);
                  }
                }}
                disabled={isGeneratingIdea}
              >
                {isGeneratingIdea ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>
          </div>

          {/* Bottom: AI result (human-readable; raw JSON stored in DB on Save idea) */}
          <div className="shrink-0 border-t p-6 bg-gray-50 max-h-[40vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">AI result</h3>
            {ideaError && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{ideaError}</div>
            )}
            {ideaAiResult ? (
              (() => {
                const parsed = getContentObject(ideaAiResult);
                if (parsed) {
                  return (
                    <div className="text-sm text-gray-800 bg-white border rounded-lg p-4 space-y-4">
                      {Object.entries(parsed).map(([key, value]) => (
                        <div key={key}>
                          <h4 className="font-semibold text-gray-700 mb-1">{labelForKey(key)}</h4>
                          <div className="text-gray-800">{renderValue(value)}</div>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white border rounded-lg p-4">
                    {ideaAiResult}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-gray-500 italic">Generate to see the idea result.</p>
            )}
          </div>

          <DialogFooter className="p-6 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedOpportunity(null);
                setIdeaInput('');
                setIdeaAiResult('');
                setIdeaError('');
              }}
              disabled={isGeneratingIdea || isSavingIdea}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedOpportunity || !ideaInput.trim() || !ideaAiResult.trim()) return;
                setIsSavingIdea(true);
                setIdeaError('');
                try {
                  await saveIdea({
                    opportunityId: selectedOpportunity.id,
                    ideaInput: ideaInput.trim(),
                    result: ideaAiResult.trim()
                  });
                  setSelectedOpportunity(null);
                  setIdeaInput('');
                  setIdeaAiResult('');
                  setIdeaError('');
                } catch (err: any) {
                  setIdeaError(err.response?.data?.error || err.message || 'Failed to save idea');
                } finally {
                  setIsSavingIdea(false);
                }
              }}
              disabled={!ideaInput.trim() || !ideaAiResult.trim() || isGeneratingIdea || isSavingIdea}
            >
              Save idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
