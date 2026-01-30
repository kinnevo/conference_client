'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, ProfileStats } from '@/types';

export default function AdminPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setError('Admin access required');
      setIsLoading(false);
      return;
    }
    if (!user.isAdmin) {
      setError('Admin access required');
      setIsLoading(false);
      return;
    }
    setError('');
    fetchData();
  }, [user]);

  async function fetchData() {
    try {
      const [profilesRes, statsRes] = await Promise.all([
        api.get('/api/admin/profiles'),
        api.get('/api/admin/stats'),
      ]);
      setProfiles(profilesRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div>Loading admin dashboard...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Registrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                General Attendees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.byType.general || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Speakers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.byType.speaker || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Administrators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.admins}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Profiles</CardTitle>
          <CardDescription>
            Complete list of registered attendees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Admin</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {profile.firstName} {profile.lastName}
                    </td>
                    <td className="p-2">{profile.email}</td>
                    <td className="p-2">{profile.company || '-'}</td>
                    <td className="p-2">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {profile.attendeeType}
                      </span>
                    </td>
                    <td className="p-2">
                      {profile.isAdmin ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
