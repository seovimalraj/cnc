// app/admin/payments/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getPaymentDetailsForAdmin,
  updatePaymentByAdmin,
  deletePaymentByAdmin,
  AdminPaymentUpdateInput,
  adminPaymentUpdateSchema,
} from '@/actions/payment';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Euro,
  FileText,
  User,
  ExternalLink,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { Database } from '@/types/supabase';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


// Type definition for a payment with joined quote and profile/customer data
type FullPaymentDetail = Exclude<
  Awaited<ReturnType<typeof getPaymentDetailsForAdmin>>['data'],
  undefined
> & {
  quotes: (Database['public']['Tables']['quotes']['Row'] & {
    customers: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'name'> | null;
  }) | null;
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'email' | 'role'> | null;
};

interface AdminPaymentDetailPageProps {
  params: {
    id: string;
  };
}

// Helper to determine badge variant based on payment status (reused from admin payments list)
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'secondary'; // Green for success
    case 'pending':
      return 'outline'; // Yellowish for pending
    case 'failed':
    case 'refunded':
      return 'destructive'; // Red for negative status
    default:
      return 'ghost'; // Fallback
  }
};


export default function AdminPaymentDetailPage() {
  const params = useParams();
  const paymentId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [payment, setPayment] = useState<FullPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableStatuses = ['pending', 'completed', 'failed', 'refunded'];

  // Form for Payment Details update
  const form = useForm<AdminPaymentUpdateInput>({
    resolver: zodResolver(adminPaymentUpdateSchema),
    defaultValues: {
      id: paymentId,
      status: 'pending',
      amount: undefined,
      currency: 'USD',
      transaction_id: '',
      payment_method: '',
    },
  });

  // Fetch initial data
  useEffect(() => {
    async function loadPaymentData() {
      setLoading(true);
      const { data, error } = await getPaymentDetailsForAdmin(paymentId);

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        router.replace('/admin/payments?error=PaymentNotFound'); // Redirect if not found
        setLoading(false);
        return;
      }

      if (data) {
        setPayment(data as FullPaymentDetail);
        form.reset({
          id: data.id,
          status: data.status || 'pending',
          amount: data.amount || undefined,
          currency: data.currency || 'USD',
          transaction_id: data.transaction_id || '',
          payment_method: data.payment_method || '',
        });
      }
      setLoading(false);
    }
    if (paymentId) {
      loadPaymentData();
    }
  }, [paymentId, router, toast, form]);


  // Handler for form submission
  const onSubmit = async (values: AdminPaymentUpdateInput) => {
    if (!payment) return;
    setIsSubmitting(true);
    const { error } = await updatePaymentByAdmin(values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payment details updated successfully!', variant: 'success' });
      fetchPaymentData(); // Re-fetch to update local state
    }
    setIsSubmitting(false);
  };

  const handleDeletePayment = async () => {
    if (!payment) return;
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    const { error } = await deletePaymentByAdmin(paymentId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payment deleted successfully.', variant: 'success' });
      router.push('/admin/payments'); // Redirect to payments list
    }
    setIsDeleting(false);
  };

  // Helper function to re-fetch all data after a submission
  const fetchPaymentData = async () => {
    setLoading(true);
    const { data, error } = await getPaymentDetailsForAdmin(paymentId);
    if (data) {
        setPayment(data as FullPaymentDetail);
        form.reset({
            id: data.id,
            status: data.status || 'pending',
            amount: data.amount || undefined,
            currency: data.currency || 'USD',
            transaction_id: data.transaction_id || '',
            payment_method: data.payment_method || '',
        });
    } else if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        router.replace('/admin/payments?error=PaymentNotFound');
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

  if (!payment) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Payment not found or inaccessible.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Euro className="mr-3 h-7 w-7" /> Payment #{payment.id?.substring(0, 8)}...
        </h2>
        <Button variant="destructive" size="sm" onClick={handleDeletePayment} disabled={isDeleting}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete Payment</span>
        </Button>
      </div>

      {/* Payment Details */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Payment Information</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Details for transaction #{payment.transaction_id || 'N/A'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
                <div>
                  <p><span className="font-semibold">Created:</span> {format(new Date(payment.created_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
                  <p><span className="font-semibold">Last Updated:</span> {format(new Date(payment.updated_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
                  <p className="flex items-center"><span className="font-semibold mr-2">Status:</span> <Badge variant={getStatusBadgeVariant(payment.status || 'pending')} className="capitalize">{payment.status}</Badge></p>
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <User className="mr-2 h-4 w-4" /> Payer:
                    {payment.payer_id && payment.profiles ? (
                      <Link href={`/admin/users/${payment.payer_id}`} className="ml-2 text-blue-600 hover:underline">
                        {payment.profiles.full_name || payment.profiles.email} <ExternalLink className="inline h-3 w-3 ml-1" />
                      </Link>
                    ) : 'N/A'}
                  </h3>
                  {payment.quotes && (
                    <p className="text-sm flex items-center">
                      <FileText className="h-4 w-4 mr-1" /> Linked to Quote:{' '}
                      <Link href={`/admin/quotes/${payment.quotes.id}`} className="ml-1 text-blue-600 hover:underline">
                        #{payment.quotes.id?.substring(0, 8)}...
                      </Link>
                      {payment.quotes.customers?.name && ` (Customer: ${payment.quotes.customers.name})`}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="my-6 dark:bg-gray-700" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableStatuses.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" maxLength={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transaction_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="txn_xxxxxxxxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Input placeholder="Stripe, PayPal, Manual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
