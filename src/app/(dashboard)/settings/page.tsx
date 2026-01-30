'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useAreas } from '@/hooks/useAreas';
import { usePrompts } from '@/hooks/usePrompts';
import {
  MapPin,
  Radio,
  LayoutGrid,
  Briefcase,
  MessageSquare,
  Users,
  Pencil,
  Trash2,
  Check,
  X,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Area, Prompt } from '@/types';
import { cn } from '@/lib/utils';

const TAB_AREAS = 'areas';
const TAB_SIGNALS = 'signals';
const TAB_CLUSTERS = 'clusters';
const TAB_OPPORTUNITIES = 'opportunities';
const TAB_PROMPTS = 'prompts';
const TAB_USERS = 'users';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { areas, isLoading: areasLoading, error: areasError, updateArea, deleteArea } = useAreas();
  const { prompts, isLoading: promptsLoading, error: promptsError, updatePrompt } = usePrompts();

  // Areas state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Prompts state
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [promptContent, setPromptContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isPromptSaving, setIsPromptSaving] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingPromptId, setPendingPromptId] = useState<string>('');

  // Track if prompt content has been modified
  const isPromptDirty = promptContent !== originalContent;

  // Get currently selected prompt
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      router.replace('/dashboard');
      return;
    }
  }, [user?.isAdmin, authLoading, router]);

  // Auto-select first prompt when prompts load
  useEffect(() => {
    if (prompts.length > 0 && !selectedPromptId) {
      const firstPrompt = prompts[0];
      setSelectedPromptId(firstPrompt.id);
      setPromptContent(firstPrompt.content);
      setOriginalContent(firstPrompt.content);
    }
  }, [prompts, selectedPromptId]);

  function handlePromptSelect(promptId: string) {
    // If there are unsaved changes, show confirmation dialog
    if (isPromptDirty) {
      setPendingPromptId(promptId);
      setShowUnsavedDialog(true);
      return;
    }

    // No unsaved changes, switch directly
    switchToPrompt(promptId);
  }

  function switchToPrompt(promptId: string) {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      setSelectedPromptId(promptId);
      setPromptContent(prompt.content);
      setOriginalContent(prompt.content);
      setPromptError('');
    }
  }

  function handleDiscardChanges() {
    setShowUnsavedDialog(false);
    if (pendingPromptId) {
      switchToPrompt(pendingPromptId);
      setPendingPromptId('');
    }
  }

  function handleCancelSwitch() {
    setShowUnsavedDialog(false);
    setPendingPromptId('');
  }

  async function handleSaveAndSwitch() {
    await savePromptContent();
    setShowUnsavedDialog(false);
    if (pendingPromptId) {
      switchToPrompt(pendingPromptId);
      setPendingPromptId('');
    }
  }

  async function savePromptContent() {
    if (!selectedPromptId || !isPromptDirty) return;

    setIsPromptSaving(true);
    setPromptError('');

    try {
      const updated = await updatePrompt(selectedPromptId, promptContent);
      setOriginalContent(updated.content);
    } catch (err: any) {
      setPromptError(err.message || 'Failed to save prompt');
    } finally {
      setIsPromptSaving(false);
    }
  }

  // Areas functions
  function startEdit(area: Area) {
    setEditingId(area.id);
    setEditName(area.name);
    setActionError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setActionError('');
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    setActionError('');
    try {
      await updateArea(editingId, editName.trim());
      cancelEdit();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update area');
    } finally {
      setIsSaving(false);
    }
  }

  function openDeleteConfirm(area: Area) {
    setDeleteTarget(area);
    setActionError('');
  }

  function closeDeleteConfirm() {
    if (!isDeleting) setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionError('');
    try {
      await deleteArea(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete area');
    } finally {
      setIsDeleting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue={TAB_AREAS} className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto p-2">
          <TabsTrigger value={TAB_AREAS} className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Areas</span>
          </TabsTrigger>
          <TabsTrigger value={TAB_SIGNALS} className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Signals</span>
          </TabsTrigger>
          <TabsTrigger value={TAB_CLUSTERS} className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Clusters</span>
          </TabsTrigger>
          <TabsTrigger value={TAB_OPPORTUNITIES} className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Opportunities</span>
          </TabsTrigger>
          <TabsTrigger value={TAB_PROMPTS} className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Prompts</span>
          </TabsTrigger>
          <TabsTrigger value={TAB_USERS} className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_AREAS} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Areas of Interest</CardTitle>
              <CardDescription>
                Manage your areas of interest. Edit or remove existing areas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{actionError}</div>
              )}
              {areasLoading ? (
                <p className="text-sm text-gray-600">Loading areas...</p>
              ) : areasError ? (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{areasError}</div>
              ) : areas.length === 0 ? (
                <p className="text-sm text-gray-600">No areas yet.</p>
              ) : (
                <ul className="space-y-2">
                  {areas.map((area) => (
                    <li
                      key={area.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm',
                        editingId === area.id && 'ring-2 ring-primary'
                      )}
                    >
                      {editingId === area.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="flex-1"
                            disabled={isSaving}
                            autoFocus
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={saveEdit}
                              disabled={isSaving || !editName.trim()}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium flex-1">{area.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(area)}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              aria-label="Edit area"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(area)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label="Delete area"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_SIGNALS}>
          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
              <CardDescription>Manage signals.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_CLUSTERS}>
          <Card>
            <CardHeader>
              <CardTitle>Clusters</CardTitle>
              <CardDescription>Manage clusters.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_OPPORTUNITIES}>
          <Card>
            <CardHeader>
              <CardTitle>Opportunities</CardTitle>
              <CardDescription>Manage opportunities.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_PROMPTS} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Prompts</CardTitle>
              <CardDescription>
                Edit system prompts used throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {promptsLoading ? (
                <p className="text-sm text-gray-600">Loading prompts...</p>
              ) : promptsError ? (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{promptsError}</div>
              ) : prompts.length === 0 ? (
                <p className="text-sm text-gray-600">No prompts configured.</p>
              ) : (
                <>
                  {/* Dropdown and Save button row */}
                  <div className="flex items-center gap-3">
                    <Select value={selectedPromptId} onValueChange={handlePromptSelect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={savePromptContent}
                      disabled={!isPromptDirty || isPromptSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isPromptSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>

                  {/* Description */}
                  {selectedPrompt?.description && (
                    <p className="text-sm text-gray-500">{selectedPrompt.description}</p>
                  )}

                  {/* Error message */}
                  {promptError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{promptError}</div>
                  )}

                  {/* Unsaved indicator */}
                  {isPromptDirty && (
                    <div className="bg-yellow-50 text-yellow-700 p-2 rounded-md text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                      You have unsaved changes
                    </div>
                  )}

                  {/* Editor panel */}
                  <Textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    placeholder="Enter prompt content..."
                    className="min-h-[300px] font-mono text-sm"
                    disabled={isPromptSaving}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_USERS}>
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage users.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete area confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <DialogContent showClose={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete area</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="bg-red-50 text-red-600 p-2 rounded text-sm">{actionError}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteConfirm} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={(open) => !open && handleCancelSwitch()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to the current prompt. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelSwitch}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscardChanges}>
              Discard
            </Button>
            <Button onClick={handleSaveAndSwitch} disabled={isPromptSaving}>
              {isPromptSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
