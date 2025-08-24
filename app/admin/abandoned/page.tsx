// app/admin/abandoned/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllAbandonedQuotesForAdmin, claimAbandonedQuote, deleteAbandonedQuote } from '@/actions/abandoned';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { MailWarning, Loader2, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';
import { Database } from '@/types/supabase';

// Type definition for an abandoned quote with joined part data
type AbandonedQuoteWithPart = Database['public']['Tables']['abandoned_quotes']['Row'] & {
  parts: Pick<Database['public']['Tables']['parts']['Row'], 'id' | 'file_name' | 'created_at' | 'owner_id'> | null;
};

export default function AdminAbandonedQuotesPage() {
  const { toast } = useToast();
  const [abandonedQuotes, setAbandonedQuotes] = useState<AbandonedQuoteWithPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState<string | null>(null); // Stores ID of quote being claimed
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores ID of quote being deleted

  useEffect(() => {
    fetchAbandonedQuotes();
  }, []);

  const fetchAbandonedQuotes = async () => {
    setLoading(true);
    const { data, error } = await getAllAbandonedQuotesForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setAbandonedQuotes(data || []);
    }
    setLoading(false);
  };

  const handleClaimQuote = async (id: string) => {
    if (!confirm('Are you sure you want to claim this abandoned quote? This will mark it as being followed up.')) {
      return;
    }
    setIsClaiming(id);
    const { error } = await claimAbandonedQuote(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Abandoned quote claimed successfully.', variant: 'success' });
      fetchAbandonedQuotes(); // Re-fetch to update the status
    }
    setIsClaiming(null);
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this abandoned quote record? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(id);
    const { error } = await deleteAbandonedQuote(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Abandoned quote deleted successfully.', variant: 'success' });
      fetchAbandonedQuotes(); // Re-fetch to remove it from the list
    }
    setIsDeleting(null);
  };

  const columns: ColumnDef<AbandonedQuoteWithPart>[] = [
    {
      accessorKey: 'parts.file_name',
      header: 'Part File',
      cell: ({ row }) => (
        row.original.parts?.id ? (
          <Link href={`/admin/parts/${row.original.parts.id}`} className="font-medium text-blue-600 hover:underline">
            {row.original.parts.file_name || 'N/A'} <ExternalLink className="inline h-3 w-3 ml-1" />
          </Link>
        ) : 'N/A'
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact Email',
      cell: ({ row }) => <div>{row.original.email || 'N/A'}</div>,
    },
    {
      accessorKey: 'contact_info.phone', // Assuming phone is nested in contact_info JSONB
      header: 'Phone',
      cell: ({ row }) => <div>{(row.original.contact_info as any)?.phone || 'N/A'}</div>,
    },
    {
      accessorKey: 'is_claimed',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_claimed ? 'secondary' : 'outline'}>
          {row.original.is_claimed ? 'Claimed' : 'Unclaimed'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created On',
      cell: ({ row }) => <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy HH:mm')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          {!row.original.is_claimed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClaimQuote(row.original.id)}
              disabled={isClaiming === row.original.id}
              className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              {isClaiming === row.original.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span className="ml-2">Claim</span>
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteQuote(row.original.id)}
            disabled={isDeleting === row.original.id}
            className="group"
          >
            {isDeleting === row.original.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
              Abandoned Quotes
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Leads from customers who started but did not complete a quote.
            </CardDescription>
          </div>
          {/* Add actions like exporting all unclaimed to CRM if needed */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={abandonedQuotes}
            filterColumnId="email" // Filter by email
            csvExportFileName="abandoned_quotes.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}
