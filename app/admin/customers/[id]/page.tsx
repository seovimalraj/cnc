// app/admin/customers/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getCustomerDetailsForAdmin,
  updateCustomerInfo,
  updateCustomerAddressByAdmin,
  deleteCustomerByAdmin,
} from '@/actions/customer';
import { getAllPartsForAdmin } from '@/actions/part'; // To fetch customer's parts
import { getAllQuotesForAdmin } from '@/actions/quote'; // To fetch customer's quotes
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  User,
  Building2,
  MapPin,
  Package,
  FileText,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  customerSchema,
  CustomerInput,
  customerAddressSchema,
  CustomerAddressInput,
} from '@/lib/validators/customer';
import { Database } from '@/types/supabase'; // Import Database type
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge'; // Ensure Badge is imported

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

type FullCustomerDetail = Exclude<
  Awaited<ReturnType<typeof getCustomerDetailsForAdmin>>['data'],
  undefined
> & {
  profiles: Database['public']['Tables']['profiles']['Row'] | null;
};

type PartRow = Database['public']['Tables']['parts']['Row'];
type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<FullCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerParts, setCustomerParts] = useState<PartRow[]>([]);
  const [customerQuotes, setCustomerQuotes] = useState<QuoteRow[]>([]);

  // Form for Customer Information
  const customerInfoForm = useForm<Omit<CustomerInput, 'id' | 'billing_address' | 'shipping_address' | 'owner_id'>>({
    resolver: zodResolver(customerSchema.omit({id: true, billing_address: true, shipping_address: true, owner_id: true})),
    defaultValues: {
      name: '',
      website: '',
      notes: '',
    },
  });

  // Form for Billing Address
  const billingAddressForm = useForm<CustomerAddressInput>({
    resolver: zodResolver(customerAddressSchema),
    defaultValues: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Form for Shipping Address
  const shippingAddressForm = useForm<CustomerAddressInput>({
    resolver: zodResolver(customerAddressSchema),
    defaultValues: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Fetch initial data
  useEffect(() => {
    async function loadCustomerData() {
      setLoading(true);
      const { data, error } = await getCustomerDetailsForAdmin(customerId);

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        router.replace('/admin/customers?error=CustomerNotFound'); // Redirect if not found
        setLoading(false);
        return;
      }

      if (data) {
        setCustomer(data as FullCustomerDetail);
        customerInfoForm.reset({
          name: data.name,
          website: data.website || '',
          notes: data.notes || '',
        });
        if (data.billing_address) {
          billingAddressForm.reset(data.billing_address as CustomerAddressInput);
        }
        if (data.shipping_address) {
          shippingAddressForm.reset(data.shipping_address as CustomerAddressInput);
        }

        // Fetch associated parts
        const { data: partsData, error: partsError } = await getAllPartsForAdmin(); // Get all parts
        if (partsError) console.error('Error fetching parts for customer:', partsError);
        // Filter parts specific to this customer
        setCustomerParts((partsData || []).filter(p => p.owner_id === data.profiles?.id));

        // Fetch associated quotes
        const { data: quotesData, error: quotesError } = await getAllQuotesForAdmin(); // Get all quotes
        if (quotesError) console.error('Error fetching quotes for customer:', quotesError);
        // Filter quotes specific to this customer
        setCustomerQuotes((quotesData || []).filter(q => q.customer_id === data.id));
      }
      setLoading(false);
    }
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId, router, toast, customerInfoForm, billingAddressForm, shippingAddressForm]);


  // Handlers for form submissions
  const handleCustomerInfoSubmit = async (values: Omit<CustomerInput, 'id' | 'billing_address' | 'shipping_address' | 'owner_id'>) => {
    if (!customer) return;
    setIsSubmitting(true);
    const { error } = await updateCustomerInfo(customerId, values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Customer info updated successfully!', variant: 'success' });
      fetchCustomerData(); // Re-fetch to update local state
    }
    setIsSubmitting(false);
  };

  const handleBillingAddressSubmit = async (values: CustomerAddressInput) => {
    if (!customer) return;
    setIsSubmitting(true);
    const { error } = await updateCustomerAddressByAdmin(customerId, 'billing_address', values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Billing address updated successfully!', variant: 'success' });
      fetchCustomerData();
    }
    setIsSubmitting(false);
  };

  const handleShippingAddressSubmit = async (values: CustomerAddressInput) => {
    if (!customer) return;
    setIsSubmitting(true);
    const { error } = await updateCustomerAddressByAdmin(customerId, 'shipping_address', values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Shipping address updated successfully!', variant: 'success' });
      fetchCustomerData();
    }
    setIsSubmitting(false);
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (!confirm('Are you sure you want to delete this customer? This will NOT delete the associated user profile, but will unlink all their quotes and parts. This action cannot be undone.')) {
      return;
    }
    setIsSubmitting(true);
    const { error } = await deleteCustomerByAdmin(customerId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Customer deleted successfully.', variant: 'success' });
      router.push('/admin/customers'); // Redirect to customers list
    }
    setIsSubmitting(false);
  };

  // Helper function to re-fetch all data after a submission
  const fetchCustomerData = async () => {
    setLoading(true);
    const { data, error } = await getCustomerDetailsForAdmin(customerId);
    if (data) {
        setCustomer(data as FullCustomerDetail);
        // Also re-fetch parts and quotes for consistency
        const { data: partsData } = await getAllPartsForAdmin();
        setCustomerParts((partsData || []).filter(p => p.owner_id === data.profiles?.id));
        const { data: quotesData } = await getAllQuotesForAdmin();
        setCustomerQuotes((quotesData || []).filter(q => q.customer_id === data.id));
    }
    setLoading(false);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Customer not found or inaccessible.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Building2 className="mr-3 h-7 w-7" /> {customer.name}
        </h2>
        <Button variant="destructive" size="sm" onClick={handleDeleteCustomer} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete Customer</span>
        </Button>
      </div>

      {/* Customer Information and Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <User className="mr-2 h-5 w-5" /> Customer Information
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              General details for {customer.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Owner: {' '}
                <Link href={`/admin/users/${customer.profiles?.id}`} className="text-blue-600 hover:underline">
                    {customer.profiles?.full_name || customer.profiles?.email || 'N/A'} <ExternalLink className="inline h-3 w-3 ml-1" />
                </Link> ({customer.profiles?.role})
            </p>
            <Form {...customerInfoForm}>
              <form onSubmit={customerInfoForm.handleSubmit(handleCustomerInfoSubmit)} className="space-y-4">
                <FormField
                  control={customerInfoForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={customerInfoForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={customerInfoForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal notes about the customer..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Info'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Addresses */}
        <div className="space-y-6">
          <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5" /> Billing Address
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Customer's billing address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...billingAddressForm}>
                <form onSubmit={billingAddressForm.handleSubmit(handleBillingAddressSubmit)} className="space-y-4">
                  <FormField control={billingAddressForm.control} name="line1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={billingAddressForm.control} name="line2" render={({ field }) => (<FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={billingAddressForm.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={billingAddressForm.control} name="state" render={({ field }) => (<FormItem><FormLabel>State/Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={billingAddressForm.control} name="postal_code" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={billingAddressForm.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Billing'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5" /> Shipping Address
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Customer's shipping address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...shippingAddressForm}>
                <form onSubmit={shippingAddressForm.handleSubmit(handleShippingAddressSubmit)} className="space-y-4">
                  <FormField control={shippingAddressForm.control} name="line1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={shippingAddressForm.control} name="line2" render={({ field }) => (<FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={shippingAddressForm.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={shippingAddressForm.control} name="state" render={({ field }) => (<FormItem><FormLabel>State/Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={shippingAddressForm.control} name="postal_code" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={shippingAddressForm.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Shipping'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* Associated Parts */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Package className="mr-2 h-5 w-5" /> Associated Parts
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            All parts uploaded by this customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerParts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.file_name}</TableCell>
                      <TableCell>{part.status}</TableCell>
                      <TableCell>{format(new Date(part.created_at || new Date()), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/parts/${part.id}`} passHref>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" /> View Part
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No parts uploaded by this customer.</p>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* Associated Quotes */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" /> Associated Quotes
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            All quotes created by this customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerQuotes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.id?.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quote.status || 'draft')} className="capitalize">
                          {quote.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{quote.currency} {quote.total?.toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(quote.created_at || new Date()), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/quotes/${quote.id}`} passHref>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" /> View Quote
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No quotes created by this customer.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
