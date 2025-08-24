// app/admin/customers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllCustomersForAdmin, deleteCustomerByAdmin } from '@/actions/customer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Building2, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { Database } from '@/types/supabase';

// Type definition for a customer with joined profile data
type CustomerWithProfile = Database['public']['Tables']['customers']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function AdminCustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await getAllCustomersForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will NOT delete the associated user profile, but will unlink all their quotes and parts. This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteCustomerByAdmin(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Customer deleted successfully.', variant: 'success' });
      fetchCustomers();
    }
    setLoading(false);
  };

  const columns: ColumnDef<CustomerWithProfile>[] = [
    {
      accessorKey: 'name',
      header: 'Customer Name',
      cell: ({ row }) => (
        <Link href={`/admin/customers/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'profiles.email', // Accessing owner's email
      header: 'Owner Email',
      cell: ({ row }) => (
        <Link href={`/admin/users/${row.original.owner_id}`} className="text-gray-700 dark:text-gray-300 hover:underline">
          {row.original.profiles?.email || 'N/A'} <ExternalLink className="inline h-3 w-3 ml-1" />
        </Link>
      ),
    },
    {
      accessorKey: 'profiles.full_name',
      header: 'Owner Name',
      cell: ({ row }) => <div>{row.original.profiles?.full_name || 'N/A'}</div>,
    },
    {
      accessorKey: 'website',
      header: 'Website',
      cell: ({ row }) => (
        row.original.website ? (
          <a href={row.original.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Visit <ExternalLink className="inline h-3 w-3 ml-1" />
          </a>
        ) : 'N/A'
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Link href={`/admin/customers/${row.original.id}`} passHref>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" /> View
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteCustomer(row.original.id)} className="group">
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
              Customers Management
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage all customer accounts and their associated details.
            </CardDescription>
          </div>
          {/* Option to manually add a customer, usually done through signup but can be admin-initiated */}
          {/* <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
          </Button> */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={customers}
            filterColumnId="name" // Filter by customer name
            csvExportFileName="customers.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
}
