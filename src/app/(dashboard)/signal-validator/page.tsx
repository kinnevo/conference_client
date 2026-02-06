'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useSignalValidator } from '@/hooks/useSignalValidator';
import { useOpenAI } from '@/hooks/useOpenAI';
import { useAreas } from '@/hooks/useAreas';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

export default function SignalValidatorPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { validateSignal, isLoading: validating } = useOpenAI();
  const { areas, isLoading: areasLoading } = useAreas();
  const {
    signals,
    fieldOfInterest,
    description,
    currentValidationResult,
    validationHistory,
    historyIndex,
    activeSignalId,
    deleteId,
    setFieldOfInterest,
    setDescription,
    setCurrentValidationResult,
    addToHistory,
    navigateHistory,
    setDeleteId,
    saveSignal,
    updateSignal,
    deleteSignal,
    loadSignal,
    clearForm,
    syncStatus
  } = useSignalValidator();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Set first area as default when areas load
  useEffect(() => {
    if (!areasLoading && areas.length > 0 && !fieldOfInterest) {
      setFieldOfInterest(areas[0].name);
    }
  }, [areas, areasLoading, fieldOfInterest, setFieldOfInterest]);

  const handleValidate = async () => {
    if (!description.trim()) return;

    // Clear current result while validating
    setCurrentValidationResult(null);

    try {
      const result = await validateSignal(description, fieldOfInterest);
      addToHistory(result);
    } catch (error: any) {
      alert(`Validation failed: ${error.message}`);
    }
  };

  const handleSave = () => {
    if (activeSignalId) {
      updateSignal();
    } else {
      saveSignal();
    }
  };

  const getQualificationBadge = (level: string) => {
    switch (level) {
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

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'valid':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'weak':
        return <HelpCircle className="h-12 w-12 text-yellow-600" />;
      case 'not-a-signal':
        return <AlertCircle className="h-12 w-12 text-red-600" />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel */}
      <div className="w-full md:w-[450px] lg:w-[450px] flex flex-col border-r border-gray-200 bg-white">
        {/* Signal Input Section */}
        <div className="bg-white border-b border-gray-200 p-6 space-y-4">
          {activeSignalId && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">Editing</Badge>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Field of Interest</label>
            <Select value={fieldOfInterest} onValueChange={setFieldOfInterest}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areasLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : areas.length === 0 ? (
                  <SelectItem value="none" disabled>No areas available</SelectItem>
                ) : (
                  areas.map(area => (
                    <SelectItem key={area.id} value={area.name}>
                      {area.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Signal Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the observation, friction, or pattern..."
              className="h-32"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearForm}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
            <Button
              onClick={handleValidate}
              disabled={!description.trim() || validating}
              className="flex-1"
            >
              {validating ? 'Validating...' : 'Validate Signal'}
            </Button>
          </div>
        </div>

        {/* Processed Signals List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Processed Signals ({signals.length})
          </h3>

          {signals.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No signals yet. Validate your first signal above.
            </p>
          ) : (
            signals.map(signal => (
              <div
                key={signal.id}
                onClick={() => loadSignal(signal)}
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-colors",
                  activeSignalId === signal.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{signal.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{signal.fieldOfInterest}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getQualificationBadge(signal.qualificationLevel)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(signal.id);
                      }}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!currentValidationResult && !validating ? (
          // Empty State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Ready to Validate
              </h2>
              <p className="text-gray-500">
                Enter a signal description and click "Validate Signal"
              </p>
            </div>
          </div>
        ) : validating ? (
          // Loading State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Validating signal...</p>
            </div>
          </div>
        ) : currentValidationResult ? (
          // Results Display
          <>
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationHistory.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateHistory('prev')}
                    disabled={historyIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-sm text-gray-600">
                  {validationHistory.length > 0 ? historyIndex + 1 : 1} / {Math.max(validationHistory.length, 1)}
                </span>
                {validationHistory.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateHistory('next')}
                    disabled={historyIndex === validationHistory.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {syncStatus !== 'idle' && (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className={cn(
                      'inline-block w-2 h-2 rounded-full',
                      syncStatus === 'pending' && 'bg-gray-400 animate-pulse',
                      syncStatus === 'success' && 'bg-green-500',
                      syncStatus === 'error' && 'bg-red-500'
                    )} />
                    <span className={cn(
                      syncStatus === 'pending' && 'text-gray-500',
                      syncStatus === 'success' && 'text-green-600',
                      syncStatus === 'error' && 'text-red-600'
                    )}>
                      {syncStatus === 'pending' && 'Saving…'}
                      {syncStatus === 'success' && 'Saved'}
                      {syncStatus === 'error' && 'Sync failed'}
                    </span>
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  variant={activeSignalId ? 'secondary' : 'default'}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {activeSignalId ? 'Update Signal' : 'Save as New Signal'}
                </Button>
              </div>
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Original Input</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {currentValidationResult.originalInput}
                  </p>
                </CardContent>
              </Card>

              {/* Outcome */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {getOutcomeIcon(currentValidationResult.outcome)}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold capitalize mb-2">
                        {currentValidationResult.outcome.replace('-', ' ')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {currentValidationResult.signalTypes.map((type, idx) => (
                          <Badge key={idx} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis & Reasoning */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis & Reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentValidationResult.reasoning.map((point, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-indigo-600">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Two-column grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Clarification */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-900">Suggested Clarification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-800">{currentValidationResult.clarification}</p>
                  </CardContent>
                </Card>

                {/* Metrics */}
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-indigo-900">Metrics to Track</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {currentValidationResult.metrics.map((metric, idx) => (
                        <li key={idx} className="flex gap-2 text-indigo-800">
                          <span>•</span>
                          <span>{metric}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* How to Improve */}
              <Card>
                <CardHeader>
                  <CardTitle>How to Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 list-decimal list-inside">
                    {currentValidationResult.improvements.map((improvement, idx) => (
                      <li key={idx}>{improvement}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Improved Version */}
              {currentValidationResult.improvedVersion && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-900">Suggested Rewrite</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-green-800">{currentValidationResult.improvedVersion}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Signal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this signal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteSignal(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
