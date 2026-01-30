import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OpportunitiesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Opportunities</h1>
      <Card>
        <CardHeader>
          <CardTitle>Conference Opportunities</CardTitle>
          <CardDescription>Discover networking and engagement opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Opportunity discovery and recommendations will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
