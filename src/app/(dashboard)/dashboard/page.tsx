import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SparkBridgeLogo } from '@/components/sparkbridge-logo';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <div className="text-sm text-muted-foreground">
              <SparkBridgeLogo logoHeight={48} textSize="sm" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Your conference registration dashboard. Access all features from the navigation above.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Active</p>
            <p className="text-sm text-gray-600">Registration status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Get started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Select your areas of interest and explore conference opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
