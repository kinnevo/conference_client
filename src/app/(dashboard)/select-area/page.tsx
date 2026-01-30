'use client';

import { useState } from 'react';
import { useAreas } from '@/hooks/useAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectAreaPage() {
  const { areas, isLoading, error, createArea, deleteArea } = useAreas();
  const [newAreaName, setNewAreaName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleCreateArea(e: React.FormEvent) {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    setIsCreating(true);
    setCreateError('');

    try {
      await createArea(newAreaName.trim());
      setNewAreaName('');
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteArea(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      await deleteArea(id);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (isLoading) {
    return <div>Loading areas...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Areas of Interest</CardTitle>
          <CardDescription>
            Select or manage areas of interest for the conference. Changes are synced in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create New Area */}
          <form onSubmit={handleCreateArea} className="flex gap-2">
            <Input
              placeholder="New area name..."
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              disabled={isCreating}
            />
            <Button type="submit" disabled={isCreating || !newAreaName.trim()}>
              {isCreating ? 'Adding...' : 'Add Area'}
            </Button>
          </form>

          {createError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {createError}
            </div>
          )}

          {/* Areas List */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">
              Available Areas ({areas.length})
            </h3>
            {areas.length === 0 ? (
              <p className="text-sm text-gray-500">No areas available yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-white"
                  >
                    <span className="text-sm font-medium">{area.name}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteArea(area.id, area.name)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-600">
              Real-time sync enabled. Changes made by other users will appear automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
