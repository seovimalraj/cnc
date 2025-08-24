// app/admin/quotes/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getQuoteDetailsForAdmin,
  updateQuoteStatus,
  deleteQuote,
} from '@/actions/quote';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  DollarSign,
  FileText,
  Package,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  CreditCard,
  User,
  ExternalLink,
  Mail,
  Printer,
  Trash2,
  Loader2,
  PlusCircle
} from 'lucide-react';
import { getSignedUrl } from '@/lib/storage';
import { QuoteChat } from '@/components/quotes/QuoteChat';
import { UserProfile } from '@/lib/auth';
import { AdminQuoteLineItemEditor } from '@/components/quotes/AdminQuoteLineItemEditor'; // New component

// Define a type for the full quote object with all relations
type FullQuoteDetail = Exclude<Awaited<ReturnType<typeof getQuoteDetailsForAdmin>>['data'], undefined> & {
  quote_items: Array<
    Database['public']['Tables']['quote_items']['Row'] & {
      parts: Database['public']['Tables']['parts']['Row'] | null;
      materials: Database['public']['Tables']['materials']['Row'] | null;
      finishes: Database['public']['Tables']['finishes']['Row'] | null;
      tolerances: Database['public']['Tables']['tolerances']['Row'] | null;
    }
  >;
  customers: Database['public']['Tables']['customers']['Row'] | null;
  profiles: Database['public']['Tables']['profiles']['Row'] | null;
};


interface AdminQuoteDetailPageProps {
  params: {
    id: string;
  };
}

// Helper to determine badge variant based on quote status (reused from customer quotes)
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

// Map status to icon for timeline (reused from customer quotes)
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


export default function AdminQuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [quote, setQuote] = useState<FullQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null); // For chat component
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  const availableStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'abandoned', 'paid', 'in_production', 'completed'];

  useEffect(() => {
    fetchQuoteDetails();
  }, [quoteId]);

  const fetchQuoteDetails = async () => {
    setLoading(true);
    const { data, error } = await getQuoteDetailsForAdmin(quoteId);

    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      // Simulate notFound redirect if quote is not found or unauthorized
      router.replace('/admin/quotes?error=QuoteNotFound');
      setLoading(false);
      return;
    }

    // Generate signed URLs for part previews in quote items
    const quoteItemsWithSignedUrls = await Promise.all(
      (data?.quote_items || []).map(async (item) => {
        const partPreviewUrl = item.parts?.preview_url
          ? (await getSignedUrl('parts', item.parts.preview_url)).signedUrl
          : null;
        return { ...item, parts: { ...item.parts, preview_url: partPreviewUrl } };
      })
    );
    // Cast to FullQuoteDetail after ensuring quote_items is an array
    setQuote({ ...data, quote_items: quoteItemsWithSignedUrls } as FullQuoteDetail);

    // Also get the current admin/staff user profile for the chat component
    const supabase = createClient(); // Client-side client for getting user profile
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        setCurrentProfile(profileData as UserProfile);
    }

    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;
    setIsUpdatingStatus(true);
    const { error } = await updateQuoteStatus(quote.id, newStatus);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Quote status updated to ${newStatus}.`, variant: 'success' });
      fetchQuoteDetails(); // Re-fetch to update UI
    }
    setIsUpdatingStatus(false);
  };

  const handleDeleteQuote = async () => {
    if (!quote) return;
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone and will remove all associated items, messages, and payments.')) {
      return;
    }
    setIsDeletingQuote(true);
    const { error } = await deleteQuote(quote.id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Quote deleted successfully.', variant: 'success' });
      router.push('/admin/quotes'); // Redirect to quotes list
    }
    setIsDeletingQuote(false);
  };

  // Status Timeline (simplified, need to retrieve activity log for full timeline)
  const statusTimeline = useRef([
    { status: 'draft', date: quote?.created_at || '' },
  ]);

  useEffect(() => {
    if (quote) {
      const uniqueStatuses = new Set<string>();
      const tempTimeline: { status: string, date: string }[] = [];

      // Add created_at as initial status
      if (quote.created_at) {
        tempTimeline.push({ status: 'draft', date: quote.created_at });
        uniqueStatuses.add('draft');
      }

      // Add the current status if different from draft and has a distinct updated_at
      if (quote.status !== 'draft' && quote.updated_at && !uniqueStatuses.has(quote.status)) {
        tempTimeline.push({ status: quote.status || 'unknown', date: quote.updated_at });
        uniqueStatuses.add(quote.status || 'unknown');
      }

      // Sort timeline by date
      tempTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      statusTimeline.current = tempTimeline;
    }
  }, [quote]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Quote not found or inaccessible.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Quote #{quote.id?.substring(0, 8)}...
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(quote.status || 'draft')} className="text-lg py-1 px-3 capitalize">
            {quote.status?.replace(/_/g, ' ')}
          </Badge>
          <Select value={quote.status || ''} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
            <SelectTrigger className="w-[180px] rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
              <SelectValue placeholder="Change Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize dark:text-gray-200">
                  {status.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleDeleteQuote} disabled={isDeletingQuote}>
            {isDeletingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="sr-only">Delete Quote</span>
          </Button>
        </div>
      </div>

      {/* Quote Details, Customer Info, and Status Timeline */}
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
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">Total: {quote.currency} {quote.total?.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <User className="mr-2 h-4 w-4" /> Customer:
                  <Link href={`/admin/customers/${quote.customers?.id}`} className="ml-2 text-blue-600 hover:underline">
                    {quote.customers?.name || 'N/A'} <ExternalLink className="inline h-4 w-4 ml-1" />
                  </Link>
                </h3>
                <p className="text-sm">Email: {quote.profiles?.email || 'N/A'}</p>
                <p className="text-sm">Created By: {quote.profiles?.full_name || quote.profiles?.email || 'N/A'}</p>
                <p className="text-sm">Customer ID: {quote.customer_id?.substring(0, 8)}...</p>

                {quote.customers?.billing_address && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">Billing Address:</p>
                    <p>{(quote.customers.billing_address as any).line1}</p>
                    {(quote.customers.billing_address as any).line2 && <p>{(quote.customers.billing_address as any).line2}</p>}
                    <p>{(quote.customers.billing_address as any).city}, {(quote.customers.billing_address as any).state} {(quote.customers.billing_address as any).postal_code}</p>
                    <p>{(quote.customers.billing_address as any).country}</p>
                  </div>
                )}
              </div>
            </div>

            {quote.notes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Notes:</span> {quote.notes}
                </div>
            )}
            <Separator className="my-6 dark:bg-gray-700" />

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Line Items</h3>
                <AdminQuoteLineItemEditor quoteId={quote.id} onUpdateSuccess={fetchQuoteDetails} isAddingNew={true} />
            </div>
            {quote.quote_items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Part</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.quote_items.map((item) => (
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
                        <TableCell className="text-right">
                            <AdminQuoteLineItemEditor quoteId={quote.id} lineItem={item} onUpdateSuccess={fetchQuoteDetails} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No line items for this quote.</p>
            )}

            <Separator className="my-6 dark:bg-gray-700" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                <Mail className="mr-2 h-4 w-4" /> Resend Quote Link (Stub)
              </Button>
              <Button variant="outline" className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <Printer className="mr-2 h-4 w-4" /> Export PDF (Stub)
              </Button>
              {quote.status !== 'paid' && ( // Allow marking paid if not already paid
                <Button className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" onClick={() => handleStatusChange('paid')} disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />} Mark as Paid (Fallback)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Timeline Card */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Status Timeline</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Track the progress of this quote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-4">
              {statusTimeline.current.map((entry, index) => (
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
                  {/* In a production app, you'd fetch actual activity log data here */}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chat Card */}
      <div className="h-[600px] lg:h-[700px]">
        {currentProfile && <QuoteChat quoteId={quote.id} currentUserProfile={currentProfile} />}
      </div>
    </div>
  );
}
