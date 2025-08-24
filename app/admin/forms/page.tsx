// app/admin/forms/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { getAllCustomFormsForAdmin, createCustomForm, updateCustomForm, deleteCustomForm, AdminFormInput, adminFormInputSchema } from '@/actions/custom_form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Edit, Trash2, PlusCircle, ExternalLink, FormInputIcon } from 'lucide-react';
import { Database } from '@/types/supabase';
import { format } from 'date-fns';

type CustomForm = Database['public']['Tables']['custom_forms']['Row'];

export default function AdminCustomFormsPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<CustomForm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for create/edit dialog
  const form = useForm<AdminFormInput>({
    resolver: zodResolver(adminFormInputSchema),
    defaultValues: {
      name: '',
      description: '',
      audience: 'customer',
      schema: {
        title: '',
        fields: [],
      },
      is_active: true,
    },
  });

  // Watch for schema changes to keep title updated in dialog
  const formSchemaWatcher = form.watch('schema');
  useEffect(() => {
    if (formSchemaWatcher?.title) {
        form.setValue('name', formSchemaWatcher.title);
    }
  }, [formSchemaWatcher?.title]);


  // Fetch forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await getAllCustomFormsForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setForms(data || []);
    }
    setLoading(false);
  };

  const handleAddForm = () => {
    setIsEditing(false);
    setCurrentForm(null);
    form.reset({
      name: '',
      description: '',
      audience: 'customer',
      schema: {
        title: 'New Custom Form',
        description: 'Describe this form here.',
        fields: [
          {
            id: 'example_field',
            type: 'text',
            label: 'Example Text Field',
            placeholder: 'Enter text here',
            required: false,
          },
        ],
      },
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEditForm = (customForm: CustomForm) => {
    setIsEditing(true);
    setCurrentForm(customForm);
    form.reset({
      name: customForm.name,
      description: customForm.description || '',
      audience: customForm.audience || 'customer',
      schema: customForm.schema as AdminFormInput['schema'], // Cast as it's from DB JSONB
      is_active: customForm.is_active || true,
    });
    setDialogOpen(true);
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom form? This will NOT delete associated responses. This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteCustomForm(id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Custom form deleted successfully.', variant: 'success' });
      fetchForms();
    }
    setLoading(false);
  };

  const onSubmit = async (values: AdminFormInput) => {
    setIsSubmitting(true);
    let result;
    if (isEditing && currentForm) {
      result = await updateCustomForm(currentForm.id, values);
    } else {
      result = await createCustomForm(values);
    }

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      if (result.details) {
        console.error('Validation details:', result.details);
      }
    } else {
      toast({ title: 'Success', description: `Form ${isEditing ? 'updated' : 'created'} successfully!`, variant: 'success' });
      setDialogOpen(false);
      fetchForms();
    }
    setIsSubmitting(false);
  };

  const columns: ColumnDef<CustomForm>[] = [
    {
      accessorKey: 'name',
      header: 'Form Name',
      cell: ({ row }) => (
        <Link href={`/admin/forms/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <div>{row.original.description || 'N/A'}</div>,
    },
    {
      accessorKey: 'audience',
      header: 'Audience',
      cell: ({ row }) => (
        <Badge variant={row.original.audience === 'customer' ? 'secondary' : row.original.audience === 'admin' ? 'default' : 'outline'}>
          {row.original.audience}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'secondary' : 'outline'}>
          {row.original.is_active ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created On',
      cell: ({ row }) => <div>{format(new Date(row.original.created_at || new Date()), 'MMM d, yyyy')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Link href={`/forms/${row.original.id}`} target="_blank" rel="noopener noreferrer" passHref>
            <Button variant="outline" size="icon" className="group">
              <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              <span className="sr-only">View Customer Form</span>
            </Button>
          </Link>
          <Button variant="outline" size="icon" onClick={() => handleEditForm(row.original)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => handleDeleteForm(row.original.id)} className="group">
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
              Custom Forms
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage custom forms for customer inquiries and data collection.
            </CardDescription>
          </div>
          <Button onClick={handleAddForm} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
          </Button>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={forms}
            filterColumnId="name"
            csvExportFileName="custom_forms.csv"
            onAddClick={handleAddForm}
            addLabel="Add Form"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Custom Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Custom Form' : 'Create New Custom Form'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {isEditing ? `Edit details for form: ${currentForm?.name}.` : 'Define a new custom form using JSON schema.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Name</FormLabel>
                    <FormControl>
                      <Input placeholder="New Project Inquiry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of this form..." {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer (Logged In)</SelectItem>
                        <SelectItem value="admin">Admin (Internal)</SelectItem>
                        <SelectItem value="public">Public (No Login Required)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Schema (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`{ "title": "My Form", "fields": [...] }`}
                        value={JSON.stringify(field.value, null, 2)}
                        onChange={(e) => {
                            try {
                                field.onChange(JSON.parse(e.target.value));
                            } catch (error) {
                                // Invalid JSON, don't update field value immediately
                                // This allows user to type incomplete JSON.
                                // Validation happens on submit.
                                console.log('Invalid JSON input for schema:', error);
                            }
                        }}
                        rows={15}
                        className="font-mono text-xs"
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
                        Determine if this form is currently active and usable.
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
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Form')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
