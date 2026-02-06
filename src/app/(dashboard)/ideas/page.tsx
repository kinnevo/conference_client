'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useIdeas, type Idea } from '@/hooks/useIdeas';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';

/** Try to parse JSON from raw string (strip markdown fences, handle array → first element). */
function tryParseJson(str: string): unknown {
  let s = str.replace(/\r\n/g, '\n').trim();
  // Strip markdown code block (optional leading text, then ```json or ```, then content, then ```)
  const codeBlockMatch = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  if (codeBlockMatch) s = codeBlockMatch[1].trim();
  else s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    const startObj = s.indexOf('{');
    const startArr = s.indexOf('[');
    const start = startObj < 0 ? startArr : startArr < 0 ? startObj : Math.min(startObj, startArr);
    if (start < 0) return null;
    const open = s[start] as '{' | '[';
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    let quote: string | null = null;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (escape) { escape = false; continue; }
      if (c === '\\' && inString) { escape = true; continue; }
      if (inString) { if (c === quote) inString = false; continue; }
      if (c === '"' || c === "'") { quote = c; inString = true; continue; }
      if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; } } }
    }
    return null;
  }
}

function getContentObject(raw: string): Record<string, unknown> | null {
  const parsed = tryParseJson(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    return typeof first === 'object' && first !== null && !Array.isArray(first) ? (first as Record<string, unknown>) : null;
  }
  return !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

const LABELS: Record<string, string> = {
  title: 'Title',
  clusterTitle: 'Cluster title',
  opportunityTitle: 'Opportunity title',
  summary: 'Summary',
  outcome: 'Outcome',
  reasoning: 'Reasoning',
  description: 'Description',
  insights: 'Insights',
  recommendations: 'Recommendations',
  nextSteps: 'Next steps',
  score: 'Score',
  ideas: 'Ideas'
};

function labelForKey(key: string): string {
  return LABELS[key] ?? key.replace(/([A-Z_])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

/** Human-readable summary for card (never raw JSON). */
function getCoreConcept(content: string): string {
  const obj = getContentObject(content);
  if (obj) {
    const title = (obj.title ?? obj.summary ?? obj.outcome ?? obj.description) as string | undefined;
    if (typeof title === 'string' && title.trim()) return title.trim();
    const reasoning = obj.reasoning as string[] | undefined;
    if (Array.isArray(reasoning) && reasoning.length > 0 && typeof reasoning[0] === 'string') {
      const line = reasoning[0].trim();
      return line.length > 150 ? line.slice(0, 150).trim() + '…' : line;
    }
    const outcome = obj.outcome as string | undefined;
    if (typeof outcome === 'string' && outcome.trim()) return `Outcome: ${outcome.trim()}`;
    const keys = Object.keys(obj).slice(0, 2);
    const parts = keys.map((k) => {
      const v = (obj as Record<string, unknown>)[k];
      const str = typeof v === 'string' ? v : Array.isArray(v) ? (v[0] != null ? String(v[0]) : '') : String(v);
      return `${labelForKey(k)}: ${str.slice(0, 50)}`;
    }).filter(Boolean);
    return parts.join(' · ') || 'Idea';
  }
  const trimmed = content.replace(/\r\n/g, '\n').trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  if (stripped.startsWith('{') || stripped.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'Idea (double-click to view)';
  }
  return content.length > 150 ? content.slice(0, 150).trim() + '…' : content;
}

function valueToPlainText(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item))).join('\n• ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${labelForKey(k)}: ${valueToPlainText(v)}`)
      .join('\n');
  }
  return String(value);
}

/** Turn idea result JSON into plain text for PDF. */
function resultToPlainText(raw: string): string {
  const obj = getContentObject(raw);
  if (obj) {
    return Object.entries(obj)
      .map(([key, value]) => `${labelForKey(key)}\n${valueToPlainText(value)}`)
      .join('\n\n');
  }
  return raw;
}

/** Full idea as plain text for PDF export. */
function ideaToPlainText(idea: Idea): string {
  const date = new Date(idea.created_at).toLocaleString();
  return `Idea\nCreated: ${date}\n\nYour input\n${idea.idea_input}\n\nAI result\n${resultToPlainText(idea.result)}`;
}

function exportIdeaAsPdf(idea: Idea): void {
  const text = ideaToPlainText(idea);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxW = pageW - margin * 2;
  const lineHeight = 6;
  const lines = doc.splitTextToSize(text, maxW);
  let y = margin;
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  doc.save(`idea-${idea.id.slice(0, 8)}-${new Date(idea.created_at).toISOString().slice(0, 10)}.pdf`);
}

/** Render value for display — human-readable, no raw JSON. */
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
              <span className="text-gray-700">
                {Object.entries(v as Record<string, unknown>).map(([kk, vv]) => `${labelForKey(kk)}: ${typeof vv === 'string' ? vv : Array.isArray(vv) ? vv.join(', ') : String(vv)}`).join(' · ')}
              </span>
            ) : String(v)}
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

/** Render full result as human-readable (from JSON). Never show raw JSON. */
function renderContentHumanReadable(content: string): ReactNode {
  let parsed = getContentObject(content);
  if (!parsed && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
    try {
      const s = content.replace(/\r\n/g, '\n').trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const p = JSON.parse(s);
      if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'object' && p[0] !== null) parsed = p[0] as Record<string, unknown>;
      else if (typeof p === 'object' && p !== null && !Array.isArray(p)) parsed = p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
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

export default function IdeasPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { ideas, isLoading, error } = useIdeas({ enabled: true });
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

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
      <h1 className="text-3xl font-bold mb-6">Ideas</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6" />
            Ideas
          </CardTitle>
          <CardDescription>
            Ideas generated from opportunities. Double-click a card to view full content and export as PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
          )}
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading ideas...</p>
          ) : ideas.length === 0 ? (
            <p className="text-sm text-gray-500">No ideas yet. Open an opportunity and use &quot;Generate with AI&quot; then &quot;Save idea&quot; to add ideas here.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <Card
                  key={idea.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer transition-colors hover:border-primary hover:bg-gray-50',
                    selectedIdea?.id === idea.id && 'border-primary ring-2 ring-primary/20'
                  )}
                  onDoubleClick={() => setSelectedIdea(idea)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedIdea(idea)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">
                      {idea.idea_input.slice(0, 80)}{idea.idea_input.length > 80 ? '…' : ''}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(idea.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3">{getCoreConcept(idea.result)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen idea popup */}
      <Dialog open={!!selectedIdea} onOpenChange={(open) => !open && setSelectedIdea(null)}>
        <DialogContent className="fixed left-0 top-0 z-50 max-w-none w-screen h-screen translate-x-0 translate-y-0 rounded-none flex flex-col gap-0 p-0 data-[state=open]:slide-in-from-none data-[state=closed]:slide-out-to-none">
          <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle>Idea</DialogTitle>
              <DialogDescription>
                {selectedIdea ? new Date(selectedIdea.created_at).toLocaleString() : ''}
              </DialogDescription>
            </div>
            {selectedIdea && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportIdeaAsPdf(selectedIdea)}
              >
                Export as PDF
              </Button>
            )}
          </DialogHeader>
          {selectedIdea && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Your input</h4>
                <div className="bg-gray-50 p-4 rounded border text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedIdea.idea_input}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">AI result</h4>
                <div className="bg-gray-50 p-4 rounded border">
                  {renderContentHumanReadable(selectedIdea.result)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
