// app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import {
  getAllUserProfilesForAdmin,
  updateUserProfileByAdmin,
  deleteUserProfileByAdmin,
  AdminProfileUpdateInput,
  adminProfileUpdateSchema,
} from '@/actions/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Edit, Trash2, UserPlus } from 'lucide-react';
import { UserProfile } from '@/lib/auth';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for create/edit dialog
  // Use a subset of schema for the form if not all fields are editable via UI
  const formSchema = adminProfileUpdateSchema.omit({ id: true, is_active: true }); // ID is from currentUser, is_active not yet implemented

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'customer',
      company: '',
      phone: '',
      region: '',
    },
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUserProfilesForAdmin();
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleEditUser = (userProfile: UserProfile) => {
    setIsEditing(true);
    setCurrentUser(userProfile);
    form.reset({
      full_name: userProfile.full_name || '',
      email: userProfile.email || '',
      role: userProfile.role,
      company: userProfile.company || '',
      phone: userProfile.phone || '',
      region: userProfile.region || '',
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user profile? This will also delete associated customer data, but the authentication record might persist. This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    const { error } = await deleteUserProfileByAdmin(userId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'User profile deleted successfully.', variant: 'success' });
      fetchUsers();
    }
    setLoading(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    if (!currentUser) {
        toast({ title: 'Error', description: 'No user selected for update.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const fullUpdateInput: AdminProfileUpdateInput = {
      id: currentUser.id,
      ...values,
      // is_active: currentUser.is_active // Assuming is_active is on profile
    };

    const result = await updateUserProfileByAdmin(fullUpdateInput);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      if (result.details) {
        console.error('Validation details:', result.details);
      }
    } else {
      toast({ title: 'Success', description: result.data?.message || 'User profile updated successfully!', variant: 'success' });
      setDialogOpen(false);
      fetchUsers();
    }
    setIsSubmitting(false);
  };

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: 'full_name',
      header: 'Full Name',
      cell: ({ row }) => <div className="font-medium">{row.getValue('full_name') || 'N/A'}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div>{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={row.getValue('role') === 'admin' ? 'default' : row.getValue('role') === 'staff' ? 'secondary' : 'outline'}>
          {row.getValue('role')}
        </Badge>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => <div>{row.getValue('company') || 'N/A'}</div>,
    },
    {
      accessorKey: 'region',
      header: 'Region',
      cell: ({ row }) => <div>{row.getValue('region') || 'N/A'}</div>,
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => <div>{format(new Date(row.getValue('created_at')), 'MMM d, yyyy')}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-end">
          <Button variant="outline" size="icon" onClick={() => handleEditUser(row.original)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(row.original.id)}>
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
              Users Management
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage all user profiles and their roles in the system.
            </CardDescription>
          </div>
          {/* Add user button, though new user creation is usually via signup flow */}
          {/* <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            <UserPlus className="mr-2 h-4 w-4" /> Add New User
          </Button> */}
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={columns}
            data={users}
            filterColumnId="email" // Filter by email or full_name
            csvExportFileName="users.csv"
          />
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Editing user: <span className="font-medium">{currentUser?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="North America" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting} className="rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
