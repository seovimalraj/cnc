// app/admin/finishes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getFinishes, createFinish, updateFinish, deleteFinish } from '@/actions/catalog';
import { FinishInput, finishSchema } from '@/lib/validators/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Database } from '@/types/supabase'; // Import Database types

type Finish = Database['public']['Tables']['finishes']['Row'];

export default function AdminFinishesPage() {
  const { toast } = useToast();
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFinish, setCurrentFinish] = useState<Finish | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for create/edit dialog
  const form = useForm<FinishInput>({
    resolver: zodResolver(finishSchema),
    defaultValues: {
      name: '',
      type: '',
      cost_per_m2: 0,
      setup_fee: 0,
      lead_time_days: 0,
      is_active: true,
      meta: null,
    },
  });

  // Fetch finishes on component mount
  useEffect(() => {
    fetchFinishes();
  }, []);

  const fetchFinishes = async () => {
    setLoading(true);
    const { data, error } = await getFinishes();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setFinishes(data as Finish[]);
    }
    setLoading(false);
  };

  const handleAddFinish = () => {
    setIsEditing(false);
    setCurrentFinish(null);
    form.reset({
      name: '',
      type: '',
      cost_per_m2: 0,
      setup_fee: 0,
      lead_time_days: 0,
      is_active: true,
      meta: null,
    });
    setDialogOpen(true);
  };

  const handleEditFinish = (finish: Finish) => {
    setIsEditing(true);
    setCurrentFinish(finish);
    form.reset({
      name: finish.name,
      type: finish.type || '',
      cost_per_m2: finish.cost_per_m2 || 0,
      setup_fee: finish.setup_fee || 0,
      lead_time_days: finish.lead_time_days || 0,
      is_active: finish.is_active || true,
      meta: finish.meta,
    });
    setDialogOpen(true);
  };

  const handleDeleteFinish = async (id: string) => {
    if (!confirm('Are you sure you want to delete this finish?')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteFinish(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Finish deleted successfully.', variant: 'success' });
      fetchFinishes();
    }
    setLoading(false);
  };

  const onSubmit = async (values: FinishInput) => {
    setIsSubmitting(true);
    let result;
    if (isEditing && currentFinish) {
      result = await updateFinish(currentFinish.id, values);
    } else {
      result = await createFinish(values);
    }

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      if (result.details) {
        console.error('Validation details:', result.details);
      }
    } else {
      toast({ title: 'Success', description: `Finish ${isEditing ? 'updated' : 'created'} successfully!`, variant: 'success' });
      setDialogOpen(false);
      fetchFinishes();
    }
    setIsSubmitting(false);
  };

  // Define table columns
  const columns: ColumnDef<Finish>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <div>{row.getValue('type') || 'N/A'}</div>,
    },
    {
      accessorKey: 'cost_per_m2',
      header: 'Cost per m² ($)',
      cell: ({ row }) => <div>${row.getValue('cost_per_m2')?.toFixed(2)}</div>,
    },
    {
      accessorKey: 'setup_fee',
      header: 'Setup Fee ($)',
      cell: ({ row }) => <div>${row.getValue('setup_fee')?.toFixed(2)}</div>,
    },
    {
      accessorKey: 'lead_time_days',
      header: 'Lead Time (Days)',
      cell: ({ row }) => <div>{row.getValue('lead_time_days')}</div>,
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'secondary' : 'outline'}>
          {row.getValue('is_active') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Button variant="outline" size="icon" onClick={() => handleEditFinish(row.original)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => handleDeleteFinish(row.original.id)}>
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
              Finishes Catalog
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage the surface finishes available for CNC parts.
            </CardDescription>
          </div>
          <Button onClick={handleAddFinish} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Finish
          </Button>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={finishes}
            filterColumnId="name"
            csvExportFileName="finishes.csv"
            onAddClick={handleAddFinish}
            addLabel="Add Finish"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Finish Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Finish' : 'Create New Finish'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {isEditing ? `Edit details for ${currentFinish?.name}.` : 'Add a new finish to the catalog.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Anodize - Clear" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Surface Treatment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_per_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per m² ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="8.00" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="setup_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="15.00" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="2" {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-gray-700">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Determine if this finish is visible to customers.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting} className="rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Finish')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
