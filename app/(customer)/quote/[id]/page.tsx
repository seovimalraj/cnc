// app/(customer)/quote/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getUserAndProfile, UserProfile } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator'; // shadcn/ui Separator
import { QuoteChat } from '@/components/quotes/QuoteChat';
import { format } from 'date-fns';
import { DollarSign, FileText, Package, CheckCircle2, XCircle, Info, Clock, CreditCard } from 'lucide-react';
import { getSignedUrl } from '@/lib/storage';

interface QuoteDetailPageProps {
  params: {
    id: string;
  };
}

// Helper to determine badge variant based on quote status (same as /quotes page)
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'sent':
      return 'default';
    case 'accepted':
      return 'secondary';
    case 'rejected':
    case 'expired':
    case 'abandoned':
      return 'destructive';
    case 'paid':
    case 'in_production':
    case 'completed':
      return 'success';
    default:
      return 'ghost';
  }
};

// Map status to icon for timeline
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft': return <Info className="h-4 w-4 text-blue-500" />;
    case 'sent': return <FileText className="h-4 w-4 text-purple-500" />;
    case 'accepted': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'expired': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'abandoned': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'paid': return <CreditCard className="h-4 w-4 text-green-500" />;
    case 'in_production': return <Package className="h-4 w-4 text-indigo-500" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    default: return <Info className="h-4 w-4 text-gray-500" />;
  }
};


export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id: quoteId } = params;
  const supabase = createClient();
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    redirect('/login');
  }

  // Fetch quote details
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (
        *,
        parts (id, file_name, preview_url),
        materials (id, name),
        finishes (id, name),
        tolerances (id, name)
      )
    `)
    .eq('id', quoteId)
    .eq('customer_id', profile.id) // Ensure only owner can view their quotes
    .single();

  if (quoteError) {
    console.error('Error fetching quote details:', quoteError);
    if (quoteError.code === 'PGRST116') { // No rows found
      notFound();
    }
    return <div className="text-red-500">Failed to load quote: {quoteError.message}</div>;
  }

  if (!quote) {
    notFound();
  }

  // Generate signed URLs for part previews
  const quoteItemsWithSignedUrls = await Promise.all(
    quote.quote_items.map(async (item) => {
      const partPreviewUrl = item.parts?.preview_url
        ? (await getSignedUrl('parts', item.parts.preview_url)).signedUrl
        : null;
      return { ...item, parts: { ...item.parts, preview_url: partPreviewUrl } };
    })
  );

  // Status Timeline (simplified, using created_at for initial status)
  const statusTimeline = [
    { status: 'draft', date: quote.created_at },
    // In a real app, you'd have a separate 'quote_history' or 'activity' table
    // to track actual status changes and their timestamps.
    // For now, let's assume 'sent' or 'accepted' would be based on updated_at or
    // from an admin action.
    // We'll just show the created date as the start.
  ];

  // Dynamically add more timeline entries based on status and updated_at
  if (quote.status !== 'draft') {
    statusTimeline.push({ status: quote.status, date: quote.updated_at });
  }
    // Sort timeline by date
  statusTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  const paymentEnabled = (process.env.STRIPE_SECRET_KEY || process.env.PAYPAL_CLIENT_ID);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Quote #{quote.id?.substring(0, 8)}...
        </h2>
        <Badge variant={getStatusBadgeVariant(quote.status || 'draft')} className="text-lg py-1 px-3 capitalize">
          {quote.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Quote Details and Status Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-lg shadow-sm lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Quote Overview</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Details and line items for this quote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
              <div>
                <p><span className="font-semibold">Created:</span> {format(new Date(quote.created_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
                <p><span className="font-semibold">Last Updated:</span> {format(new Date(quote.updated_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
                <p><span className="font-semibold">Region:</span> {quote.region || 'N/A'}</p>
              </div>
              <div>
                <p><span className="font-semibold">Subtotal:</span> {quote.currency} {quote.subtotal?.toFixed(2)}</p>
                <p><span className="font-semibold">Tax:</span> {quote.currency} {quote.tax?.toFixed(2)}</p>
                <p><span className="font-semibold">Shipping:</span> {quote.currency} {quote.shipping?.toFixed(2)}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white"><span className="font-semibold">Total:</span> {quote.currency} {quote.total?.toFixed(2)}</p>
              </div>
            </div>
            {quote.notes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Notes:</span> {quote.notes}
                </div>
            )}
            <Separator className="my-6 dark:bg-gray-700" />

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Line Items</h3>
            {quoteItemsWithSignedUrls.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Part</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItemsWithSignedUrls.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                            {item.parts?.preview_url ? (
                                <img src={item.parts.preview_url} alt={`Preview of ${item.parts.file_name}`} className="w-16 h-16 object-cover rounded-md" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-400">
                                    <Package className="h-6 w-6" />
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.parts?.file_name || 'N/A'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Material: {item.materials?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Finish: {item.finishes?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Tolerance: {item.tolerances?.name || 'N/A'}</p>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{quote.currency} {item.unit_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{quote.currency} {item.line_total?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No line items for this quote.</p>
            )}

            {/* Checkout Options */}
            {quote.status === 'sent' && paymentEnabled && ( // Only show checkout for 'sent' quotes
                <>
                    <Separator className="my-6 dark:bg-gray-700" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Payment Options</h3>
                    <div className="flex gap-4">
                        {process.env.STRIPE_SECRET_KEY && (
                            <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800">
                                Pay with Stripe (Stub)
                            </Button>
                        )}
                        {process.env.PAYPAL_CLIENT_ID && (
                            <Button className="w-full bg-blue-800 text-white hover:bg-blue-900 dark:bg-blue-900 dark:hover:bg-blue-950">
                                Pay with PayPal (Stub)
                            </Button>
                        )}
                    </div>
                </>
            )}

          </CardContent>
        </Card>

        {/* Status Timeline Card */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Status Timeline</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Track the progress of your quote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-4">
              {statusTimeline.map((entry, index) => (
                <li key={index} className="mb-6 ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 ring-8 ring-white dark:ring-gray-800">
                    {getStatusIcon(entry.status)}
                  </span>
                  <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {entry.status?.replace(/_/g, ' ')}
                  </h3>
                  <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                    {format(new Date(entry.date || new Date()), 'MMM dd, yyyy HH:mm')}
                  </time>
                  {/* You could add more detail here based on actual activity log data */}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chat Card */}
      <div className="h-[600px] lg:h-[700px]"> {/* Fixed height for chat */}
        <QuoteChat quoteId={quoteId} currentUserProfile={profile} />
      </div>
    </div>
  );
}
