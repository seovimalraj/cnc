// app/(customer)/quotes/page.tsx
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; // For status display
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, PlusCircle } from 'lucide-react';

export default async function CustomerQuotesPage() {
  const supabase = createServerSupabase();
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    // This should ideally be caught by middleware or layout, but good for type safety
    return <div className="text-red-500">Error: User not authenticated.</div>;
  }

  // Fetch all quotes for the current customer profile
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, status, total, currency, created_at, notes')
    .eq('customer_id', profile.id)
    .order('created_at', { ascending: false });

  if (quotesError) {
    console.error('Error fetching customer quotes:', quotesError);
    return <div className="text-red-500">Failed to load your quotes: {quotesError.message}</div>;
  }

  // Helper to determine badge variant based on quote status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'outline'; // Default outline for drafts
      case 'sent':
        return 'default'; // Primary for sent
      case 'accepted':
        return 'secondary'; // Green for accepted
      case 'rejected':
      case 'expired':
      case 'abandoned':
        return 'destructive'; // Red for negative statuses
      case 'paid':
      case 'in_production':
      case 'completed':
        return 'success'; // Success for positive statuses (assuming a 'success' variant exists or define one)
      default:
        return 'ghost'; // Fallback
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Quotes
        </h2>
        <Link href="/instant-quote" passHref>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> New Instant Quote
          </Button>
        </Link>
      </div>

      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Quote History
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            A list of all your submitted and drafted quotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Quote ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quote.status || 'draft')} className="capitalize">
                          {quote.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {quote.currency} {quote.total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(quote.created_at || new Date()), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/quotes/${quote.id}`} passHref>
                          <Button variant="outline" size="sm" className="group">
                            <FileText className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              You don't have any quotes yet. <Link href="/instant-quote" className="text-blue-600 hover:underline">Create an instant quote</Link> to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
