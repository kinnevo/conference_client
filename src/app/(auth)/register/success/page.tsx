import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">Registration Successful!</CardTitle>
          <CardDescription>
            Your account has been created
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Welcome to the Conference Registration System! Your account has been successfully created.
          </p>
          <p className="text-sm text-gray-600">
            You can now sign in and start exploring the platform.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In Now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
