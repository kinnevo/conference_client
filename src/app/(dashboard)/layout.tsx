'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { RequireAuth } from '@/components/require-auth';
import { Button } from '@/components/ui/button';
import { SparkBridgeLogo } from '@/components/sparkbridge-logo';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Select Area', href: '/select-area' },
  { name: 'Signal Validator', href: '/signal-validator' },
  { name: 'Clusters', href: '/clusters' },
  { name: 'Opportunities', href: '/opportunities' },
  { name: 'Ideas', href: '/ideas' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-50">
      {/* Header - left: Logo + SparkBridge; right: "Speaker: Name" (based on attendeeType) */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <SparkBridgeLogo logoHeight={64} textSize="md" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {[
                  user?.isAdmin ? 'Admin' : user?.attendeeType === 'speaker' ? 'Speaker' : user?.attendeeType === 'sponsor' ? 'Sponsor' : user?.attendeeType === 'vip' ? 'VIP' : 'Participant',
                  [user?.firstName, user?.lastName].filter(Boolean).join(' ')
                ].join(': ')}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap',
                  pathname === item.href
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {item.name}
              </Link>
            ))}
            {user?.isAdmin && (
              <>
                <Link
                  href="/settings"
                  className={cn(
                    'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap',
                    pathname === '/settings'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Settings
                </Link>
                <Link
                  href="/admin"
                  className={cn(
                    'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap',
                    pathname === '/admin'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Admin
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
    </RequireAuth>
  );
}
