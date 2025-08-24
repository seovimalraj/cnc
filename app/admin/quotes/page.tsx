// app/admin/quotes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllQuotesForAdmin, deleteQuote } from '@/actions/quote'; // Import the new action
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { Database } from '@/types/supabase';

// Type definition for a quote with joined customer and profile data
type QuoteWithRelations = Database['public']['Tables']['quotes']['Row'] & {
  customers: { name: string | null } | null;
  profiles: { full_name: string | null; email: string | null; role: string | null } | null;
};

// Helper to determine badge variant based on quote status (reused from customer quotes)
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'sent':
      return 'default';
    case 'accepted':
      return 'secondary'; // Using secondary for accepted (greenish)
    case 'rejected':
    case 'expired':
    case 'abandoned':
      return 'destructive';
    case 'paid':
    case 'in_production':
    case 'completed':
      return 'success'; // Assuming a 'success' variant exists for Badge
    default:
      return 'ghost';
  }
};


export default function AdminQuotesPage() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    const { data, error } = await getAllQuotesForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setQuotes(data as QuoteWithRelations[]);
    }
    setLoading(false);
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote and all its associated items and messages? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteQuote(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Quote deleted successfully.', variant: 'success' });
      fetchQuotes();
    }
    setLoading(false);
  };

  const columns: ColumnDef<QuoteWithRelations>[] = [
    {
      accessorKey: 'id',
      header: 'Quote ID',
      cell: ({ row }) => (
        <Link href={`/admin/quotes/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.id?.substring(0, 8)}...
        </Link>
      ),
    },
    {
      accessorKey: 'customers.name', // Accessing nested customer name
      header: 'Customer',
      cell: ({ row }) => (
        <Link href={`/admin/customers/${row.original.customers?.id}`} className="text-gray-700 dark:text-gray-300 hover:underline">
           {row.original.customers?.name || 'N/A'}
        </Link>
      ),
    },
    {
      accessorKey: 'profiles.full_name', // Accessing creator's full name
      header: 'Created By',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.original.profiles?.full_name || row.original.profiles?.email || 'N/A'} ({row.original.profiles?.role})
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status || 'draft')} className="capitalize">
          {row.original.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.currency} {row.original.total?.toFixed(2) || '0.00'}
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => (
        <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy HH:mm')}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Link href={`/admin/quotes/${row.original.id}`} passHref>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" /> View
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteQuote(row.original.id)} className="group">
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
              All Quotes
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage all customer quotes and their statuses.
            </CardDescription>
          </div>
          {/* Add a button for creating a new quote if desired, e.g., linking to /admin/quotes/new */}
          {/* <Button onClick={() => router.push('/admin/quotes/new')} className="bg-blue-600 text-white hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Quote
          </Button> */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={quotes}
            filterColumnId="customers.name" // Filter by customer name
            csvExportFileName="admin_quotes.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}
