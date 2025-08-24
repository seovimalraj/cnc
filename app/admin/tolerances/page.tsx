// app/admin/tolerances/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getTolerances, createTolerance, updateTolerance, deleteTolerance } from '@/actions/catalog';
import { ToleranceInput, toleranceSchema } from '@/lib/validators/catalog';
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

type Tolerance = Database['public']['Tables']['tolerances']['Row'];

export default function AdminTolerancesPage() {
  const { toast } = useToast();
  const [tolerances, setTolerances] = useState<Tolerance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTolerance, setCurrentTolerance] = useState<Tolerance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for create/edit dialog
  const form = useForm<ToleranceInput>({
    resolver: zodResolver(toleranceSchema),
    defaultValues: {
      name: '',
      tol_min_mm: undefined,
      tol_max_mm: undefined,
      cost_multiplier: 1.0,
      is_active: true,
      meta: null,
    },
  });

  // Fetch tolerances on component mount
  useEffect(() => {
    fetchTolerances();
  }, []);

  const fetchTolerances = async () => {
    setLoading(true);
    const { data, error } = await getTolerances();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setTolerances(data as Tolerance[]);
    }
    setLoading(false);
  };

  const handleAddTolerance = () => {
    setIsEditing(false);
    setCurrentTolerance(null);
    form.reset({
      name: '',
      tol_min_mm: undefined,
      tol_max_mm: undefined,
      cost_multiplier: 1.0,
      is_active: true,
      meta: null,
    });
    setDialogOpen(true);
  };

  const handleEditTolerance = (tolerance: Tolerance) => {
    setIsEditing(true);
    setCurrentTolerance(tolerance);
    form.reset({
      name: tolerance.name,
      tol_min_mm: tolerance.tol_min_mm || undefined,
      tol_max_mm: tolerance.tol_max_mm || undefined,
      cost_multiplier: tolerance.cost_multiplier || 1.0,
      is_active: tolerance.is_active || true,
      meta: tolerance.meta,
    });
    setDialogOpen(true);
  };

  const handleDeleteTolerance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tolerance?')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteTolerance(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Tolerance deleted successfully.', variant: 'success' });
      fetchTolerances();
    }
    setLoading(false);
  };

  const onSubmit = async (values: ToleranceInput) => {
    setIsSubmitting(true);
    let result;
    if (isEditing && currentTolerance) {
      result = await updateTolerance(currentTolerance.id, values);
    } else {
      result = await createTolerance(values);
    }

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      if (result.details) {
        console.error('Validation details:', result.details);
      }
    } else {
      toast({ title: 'Success', description: `Tolerance ${isEditing ? 'updated' : 'created'} successfully!`, variant: 'success' });
      setDialogOpen(false);
      fetchTolerances();
    }
    setIsSubmitting(false);
  };

  // Define table columns
  const columns: ColumnDef<Tolerance>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'tol_min_mm',
      header: 'Min Tolerance (mm)',
      cell: ({ row }) => <div>{row.getValue('tol_min_mm')?.toFixed(3) || 'N/A'}</div>,
    },
    {
      accessorKey: 'tol_max_mm',
      header: 'Max Tolerance (mm)',
      cell: ({ row }) => <div>{row.getValue('tol_max_mm')?.toFixed(3) || 'N/A'}</div>,
    },
    {
      accessorKey: 'cost_multiplier',
      header: 'Cost Multiplier',
      cell: ({ row }) => <div>x{row.getValue('cost_multiplier')?.toFixed(2)}</div>,
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
          <Button variant="outline" size="icon" onClick={() => handleEditTolerance(row.original)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => handleDeleteTolerance(row.original.id)}>
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
              Tolerances Catalog
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage the precision tolerances available for CNC manufacturing.
            </CardDescription>
          </div>
          <Button onClick={handleAddTolerance} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Tolerance
          </Button>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={tolerances}
            filterColumnId="name"
            csvExportFileName="tolerances.csv"
            onAddClick={handleAddTolerance}
            addLabel="Add Tolerance"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Tolerance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Tolerance' : 'Create New Tolerance'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {isEditing ? `Edit details for ${currentTolerance?.name}.` : 'Add a new tolerance to the catalog.'}
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
                      <Input placeholder="Standard (+/- 0.1mm)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tol_min_mm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Tolerance (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="-0.1" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tol_max_mm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tolerance (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.1" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_multiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Multiplier</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="1.0" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
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
                        Determine if this tolerance is visible to customers.
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
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Tolerance')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
