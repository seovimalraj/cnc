// app/admin/payments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllPaymentsForAdmin, deletePaymentByAdmin } from '@/actions/payment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Euro, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { Database } from '@/types/supabase';

// Type definition for a payment with joined quote and profile data
type PaymentWithRelations = Database['public']['Tables']['payments']['Row'] & {
  quotes: Pick<Database['public']['Tables']['quotes']['Row'], 'id' | 'customer_id'> | null;
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'email' | 'role'> | null;
};

// Helper to determine badge variant based on payment status
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

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await getAllPaymentsForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deletePaymentByAdmin(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payment deleted successfully.', variant: 'success' });
      fetchPayments();
    }
    setLoading(false);
  };

  const columns: ColumnDef<PaymentWithRelations>[] = [
    {
      accessorKey: 'id',
      header: 'Payment ID',
      cell: ({ row }) => (
        <Link href={`/admin/payments/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.id?.substring(0, 8)}...
        </Link>
      ),
    },
    {
      accessorKey: 'quotes.id',
      header: 'Quote ID',
      cell: ({ row }) => (
        row.original.quotes?.id ? (
          <Link href={`/admin/quotes/${row.original.quotes.id}`} className="text-gray-700 dark:text-gray-300 hover:underline">
            {row.original.quotes.id.substring(0, 8)}... <ExternalLink className="inline h-3 w-3 ml-1" />
          </Link>
        ) : 'N/A'
      ),
    },
    {
      accessorKey: 'payer_id',
      header: 'Payer Email',
      cell: ({ row }) => (
        row.original.profiles?.email ? (
          <Link href={`/admin/users/${row.original.payer_id}`} className="text-gray-700 dark:text-gray-300 hover:underline">
            {row.original.profiles.email} <ExternalLink className="inline h-3 w-3 ml-1" />
          </Link>
        ) : 'N/A'
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.currency} {row.original.amount?.toFixed(2) || '0.00'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status || 'pending')} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'transaction_id',
      header: 'Transaction ID',
      cell: ({ row }) => <div>{row.original.transaction_id || 'N/A'}</div>,
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy HH:mm')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          {/* Link to payment detail page (to be created) */}
          <Link href={`/admin/payments/${row.original.id}`} passHref>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" /> View
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => handleDeletePayment(row.original.id)} className="group">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
      enableHiding: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              Payments Management
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Overview and management of all payment transactions.
            </CardDescription>
          </div>
          {/* Add option to manually record a payment if needed */}
          {/* <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Record Payment
          </Button> */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={payments}
            filterColumnId="transaction_id" // Filter by transaction ID
            csvExportFileName="all_payments.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}
