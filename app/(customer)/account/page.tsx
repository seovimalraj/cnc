// app/(customer)/account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, Building2, MapPin, BellRing } from 'lucide-react';
import { fetchUserAccountData, updateProfile, updateCustomerAddress } from '@/actions/profile';
import { profileUpdateSchema, ProfileUpdateInput, addressSchema, AddressInput } from '@/lib/validators/profile';
import { UserProfile } from '@/lib/auth'; // For type inference
import type { Database } from '@/types/supabase'; // Import Database type

// Local schemas for forms
const profileFormSchema = profileUpdateSchema;
const addressFormSchema = addressSchema;

type CustomerRow = Database['public']['Tables']['customers']['Row'];

export default function AccountPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerRow | null>(null);

  // Form for Profile settings
  const profileForm = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      company: '',
      phone: '',
      region: '',
    },
  });

  // Form for Billing Address
  const billingAddressForm = useForm<AddressInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Form for Shipping Address
  const shippingAddressForm = useForm<AddressInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });


  // Fetch initial data
  useEffect(() => {
    async function loadAccountData() {
      setLoading(true);
      const { data, error } = await fetchUserAccountData();

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (data?.profile) {
        setCurrentProfile(data.profile);
        profileForm.reset({
          full_name: data.profile.full_name || '',
          company: data.profile.company || '',
          phone: data.profile.phone || '',
          region: data.profile.region || '',
        });
      }

      if (data?.customer) {
        setCurrentCustomer(data.customer);
        if (data.customer.billing_address) {
          billingAddressForm.reset(data.customer.billing_address as AddressInput);
        }
        if (data.customer.shipping_address) {
          shippingAddressForm.reset(data.customer.shipping_address as AddressInput);
        }
      }
      setLoading(false);
    }
    loadAccountData();
  }, [toast, profileForm, billingAddressForm, shippingAddressForm]);


  // Handlers for form submissions
  const handleProfileSubmit = async (values: ProfileUpdateInput) => {
    setLoading(true);
    const { error } = await updateProfile(values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully!', variant: 'success' });
      // Re-fetch data to ensure UI is updated, or update state directly
      const { data } = await fetchUserAccountData();
      if (data?.profile) setCurrentProfile(data.profile);
    }
    setLoading(false);
  };

  const handleBillingAddressSubmit = async (values: AddressInput) => {
    setLoading(true);
    const { error } = await updateCustomerAddress('billing_address', values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Billing address updated successfully!', variant: 'success' });
      const { data } = await fetchUserAccountData();
      if (data?.customer) setCurrentCustomer(data.customer);
    }
    setLoading(false);
  };

  const handleShippingAddressSubmit = async (values: AddressInput) => {
    setLoading(true);
    const { error } = await updateCustomerAddress('shipping_address', values);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Shipping address updated successfully!', variant: 'success' });
      const { data } = await fetchUserAccountData();
      if (data?.customer) setCurrentCustomer(data.customer);
    }
    setLoading(false);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h2>

      {/* Profile Information */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="mr-2 h-5 w-5" /> Personal Information
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Update your personal details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
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
                control={profileForm.control}
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
                control={profileForm.control}
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
                control={profileForm.control}
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
              <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Profile'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* Addresses */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <MapPin className="mr-2 h-5 w-5" /> Your Addresses
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Manage your billing and shipping addresses.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Billing Address Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Address</h3>
            <Form {...billingAddressForm}>
              <form onSubmit={billingAddressForm.handleSubmit(handleBillingAddressSubmit)} className="space-y-3">
                <FormField
                  control={billingAddressForm.control}
                  name="line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={billingAddressForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Billing Address'}
                </Button>
              </form>
            </Form>
          </div>

          {/* Shipping Address Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shipping Address</h3>
            <Form {...shippingAddressForm}>
              <form onSubmit={shippingAddressForm.handleSubmit(handleShippingAddressSubmit)} className="space-y-3">
                <FormField
                  control={shippingAddressForm.control}
                  name="line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shippingAddressForm.control}
                  name="line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shippingAddressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shippingAddressForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shippingAddressForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shippingAddressForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Shipping Address'}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* Notification Preferences (Placeholder) */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <BellRing className="mr-2 h-5 w-5" /> Notification Preferences
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Manage how you receive notifications. (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            This section is under development. You will be able to customize your notification settings here soon.
          </p>
          {/* Future implementation: Toggle switches for email, in-app notifications */}
        </CardContent>
      </Card>
    </div>
  );
}
