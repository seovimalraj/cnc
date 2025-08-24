// app/admin/parts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllPartsForAdmin, deletePartByAdmin, getSignedUrlForPart } from '@/actions/part';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Package, Loader2, Trash2, DownloadIcon, ExternalLink, EyeIcon } from 'lucide-react';
import { Database } from '@/types/supabase';

// Type definition for a part with joined profile data
type PartWithProfile = Database['public']['Tables']['parts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function AdminPartsPage() {
  const { toast } = useToast();
  const [parts, setParts] = useState<PartWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    const { data, error } = await getAllPartsForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setParts(data || []);
    }
    setLoading(false);
  };

  const handleDeletePart = async (id: string) => {
    if (!confirm('Are you sure you want to delete this part? This will also delete the associated file from storage. This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deletePartByAdmin(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Part and associated files deleted successfully.', variant: 'success' });
      fetchParts();
    }
    setLoading(false);
  };

  const handleDownloadPart = async (filePath: string, fileName: string) => {
    const { data: signedUrl, error } = await getSignedUrlForPart(filePath);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };


  const columns: ColumnDef<PartWithProfile>[] = [
    {
      accessorKey: 'file_name',
      header: 'File Name',
      cell: ({ row }) => (
        <Link href={`/admin/parts/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.file_name}
        </Link>
      ),
    },
    {
      accessorKey: 'profiles.email',
      header: 'Uploaded By',
      cell: ({ row }) => (
        <Link href={`/admin/users/${row.original.owner_id}`} className="text-gray-700 dark:text-gray-300 hover:underline">
          {row.original.profiles?.full_name || row.original.profiles?.email || 'N/A'} <ExternalLink className="inline h-3 w-3 ml-1" />
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'processed' ? 'secondary' : row.original.status === 'error' ? 'destructive' : 'outline'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'size_bytes',
      header: 'Size',
      cell: ({ row }) => <div>{(row.original.size_bytes / (1024 * 1024)).toFixed(2)} MB</div>,
    },
    {
      accessorKey: 'created_at',
      header: 'Uploaded On',
      cell: ({ row }) => <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Link href={`/admin/parts/${row.original.id}`} passHref>
            <Button variant="outline" size="icon">
              <EyeIcon className="h-4 w-4" />
              <span className="sr-only">View Part</span>
            </Button>
          </Link>
          {row.original.file_url && (
            <Button variant="outline" size="icon" onClick={() => handleDownloadPart(row.original.file_url!, row.original.file_name || 'part')}>
              <DownloadIcon className="h-4 w-4" />
              <span className="sr-only">Download Original</span>
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => handleDeletePart(row.original.id)} className="group">
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
              Parts Gallery
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              View and manage all uploaded CAD parts.
            </CardDescription>
          </div>
          {/* No direct "Add Part" here; parts are added via customer upload */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={parts}
            filterColumnId="file_name"
            csvExportFileName="all_parts.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}
