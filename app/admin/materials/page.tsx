// app/admin/materials/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '@/actions/catalog';
import { MaterialInput, materialSchema } from '@/lib/validators/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // shadcn/ui Switch
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Database } from '@/types/supabase'; // Import Database types

type Material = Database['public']['Tables']['materials']['Row'];

export default function AdminMaterialsPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for create/edit dialog
  const form = useForm<MaterialInput>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: '',
      density_kg_m3: undefined,
      cost_per_kg: undefined,
      machinability_factor: 1.0,
      is_active: true,
      meta: null,
    },
  });

  // Fetch materials on component mount
  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await getMaterials();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setMaterials(data as Material[]); // Cast to Material[]
    }
    setLoading(false);
  };

  const handleAddMaterial = () => {
    setIsEditing(false);
    setCurrentMaterial(null);
    form.reset({
      name: '',
      density_kg_m3: undefined,
      cost_per_kg: undefined,
      machinability_factor: 1.0,
      is_active: true,
      meta: null,
    });
    setDialogOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setIsEditing(true);
    setCurrentMaterial(material);
    form.reset({
      name: material.name,
      density_kg_m3: material.density_kg_m3 || undefined,
      cost_per_kg: material.cost_per_kg || undefined,
      machinability_factor: material.machinability_factor || 1.0,
      is_active: material.is_active || true,
      meta: material.meta,
    });
    setDialogOpen(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteMaterial(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Material deleted successfully.', variant: 'success' });
      fetchMaterials();
    }
    setLoading(false);
  };

  const onSubmit = async (values: MaterialInput) => {
    setIsSubmitting(true);
    let result;
    if (isEditing && currentMaterial) {
      result = await updateMaterial(currentMaterial.id, values);
    } else {
      result = await createMaterial(values);
    }

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      if (result.details) {
        // You might want to map Zod errors to form fields if needed
        console.error('Validation details:', result.details);
      }
    } else {
      toast({ title: 'Success', description: `Material ${isEditing ? 'updated' : 'created'} successfully!`, variant: 'success' });
      setDialogOpen(false);
      fetchMaterials();
    }
    setIsSubmitting(false);
  };

  // Define table columns
  const columns: ColumnDef<Material>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'density_kg_m3',
      header: 'Density (kg/m³)',
      cell: ({ row }) => <div>{row.getValue('density_kg_m3')?.toFixed(2) || 'N/A'}</div>,
    },
    {
      accessorKey: 'cost_per_kg',
      header: 'Cost per kg ($)',
      cell: ({ row }) => <div>${row.getValue('cost_per_kg')?.toFixed(2)}</div>,
    },
    {
      accessorKey: 'machinability_factor',
      header: 'Machinability Factor',
      cell: ({ row }) => <div>{row.getValue('machinability_factor')?.toFixed(1)}</div>,
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
          <Button variant="outline" size="icon" onClick={() => handleEditMaterial(row.original)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => handleDeleteMaterial(row.original.id)}>
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
              Materials Catalog
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage the materials available for CNC manufacturing.
            </CardDescription>
          </div>
          <Button onClick={handleAddMaterial} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Material
          </Button>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={materials}
            filterColumnId="name"
            csvExportFileName="materials.csv"
            onAddClick={handleAddMaterial}
            addLabel="Add Material"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Material Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Material' : 'Create New Material'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {isEditing ? `Edit details for ${currentMaterial?.name}.` : 'Add a new material to the catalog.'}
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
                      <Input placeholder="Aluminum 6061" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="density_kg_m3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Density (kg/m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2700" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per kg ($)</FormLabel>
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
                name="machinability_factor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machinability Factor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="1.0" {...field}
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
                        Determine if this material is visible to customers.
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
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Material')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
