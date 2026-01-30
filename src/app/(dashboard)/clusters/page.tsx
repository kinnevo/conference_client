import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClustersPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Clusters</h1>
      <Card>
        <CardHeader>
          <CardTitle>Attendee Clusters</CardTitle>
          <CardDescription>View and manage attendee groupings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Cluster analysis and management will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
