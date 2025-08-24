// app/admin/parts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getPartDetailsForAdmin,
  updatePartByAdmin,
  deletePartByAdmin,
  getSignedUrlForPart,
  AdminPartUpdateInput,
  adminPartUpdateSchema,
} from '@/actions/part';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For bbox JSON
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Package,
  FileText,
  DownloadIcon,
  Trash2,
  User,
  ExternalLink,
  EyeIcon,
  Shapes,
  FlaskConical,
} from 'lucide-react';
import { Database } from '@/types/supabase';
import { format } from 'date-fns';

// Type definition for a part with joined profile data
type FullPartDetail = Exclude<
  Awaited<ReturnType<typeof getPartDetailsForAdmin>>['data'],
  undefined
> & {
  profiles: Database['public']['Tables']['profiles']['Row'] | null;
};

interface AdminPartDetailPageProps {
  params: {
    id: string;
  };
}

// Separate schema for updating status
const statusUpdateSchema = z.object({
  status: z.enum(['uploaded', 'processing', 'processed', 'error', 'archived', 'deleted'], {
    errorMap: () => ({ message: 'Invalid part status.' }),
  }),
});

// Separate schema for updating geometry
const geometryUpdateSchema = z.object({
  volume_mm3: z.number().positive('Volume must be a positive number.').optional().nullable(),
  surface_area_mm2: z.number().positive('Surface area must be a positive number.').optional().nullable(),
  bbox: z.string().optional().nullable(), // Store as string to handle JSON input
  preview_url: z.string().url('Invalid URL format.').optional().nullable(),
});


export default function AdminPartDetailPage() {
  const params = useParams();
  const partId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [part, setPart] = useState<FullPartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [isSubmittingGeometry, setIsSubmittingGeometry] = useState(false);
  const [isDeletingPart, setIsDeletingPart] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const availableStatuses = ['uploaded', 'processing', 'processed', 'error', 'archived', 'deleted'];

  // Form for Status Update
  const statusForm = useForm<z.infer<typeof statusUpdateSchema>>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: 'uploaded',
    },
  });

  // Form for Geometry Update
  const geometryForm = useForm<z.infer<typeof geometryUpdateSchema>>({
    resolver: zodResolver(geometryUpdateSchema),
    defaultValues: {
      volume_mm3: undefined,
      surface_area_mm2: undefined,
      bbox: '',
      preview_url: '',
    },
  });


  // Fetch initial data
  useEffect(() => {
    async function loadPartData() {
      setLoading(true);
      const { data, error } = await getPartDetailsForAdmin(partId);

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        router.replace('/admin/parts?error=PartNotFound'); // Redirect if not found
        setLoading(false);
        return;
      }

      if (data) {
        setPart(data as FullPartDetail);
        statusForm.reset({ status: data.status || 'uploaded' });
        geometryForm.reset({
          volume_mm3: data.volume_mm3 || undefined,
          surface_area_mm2: data.surface_area_mm2 || undefined,
          bbox: data.bbox ? JSON.stringify(data.bbox, null, 2) : '', // Pre-fill bbox as formatted JSON string
          preview_url: data.preview_url || '',
        });

        if (data.preview_url) {
            const { data: signedUrl } = await getSignedUrlForPart(data.preview_url);
            setPreviewImageUrl(signedUrl || null);
        }
      }
      setLoading(false);
    }
    if (partId) {
      loadPartData();
    }
  }, [partId, router, toast, statusForm, geometryForm]);


  // Handlers for form submissions
  const handleStatusSubmit = async (values: z.infer<typeof statusUpdateSchema>) => {
    if (!part) return;
    setIsSubmittingStatus(true);
    const updateInput: AdminPartUpdateInput = {
      id: partId,
      status: values.status,
    };
    const { error } = await updatePartByAdmin(updateInput);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Part status updated successfully!', variant: 'success' });
      fetchPartData(); // Re-fetch to update local state
    }
    setIsSubmittingStatus(false);
  };

  const handleGeometrySubmit = async (values: z.infer<typeof geometryUpdateSchema>) => {
    if (!part) return;
    setIsSubmittingGeometry(true);

    let parsedBbox: any = null;
    if (values.bbox) {
        try {
            parsedBbox = JSON.parse(values.bbox);
        } catch (e) {
            toast({ title: 'Error', description: 'Invalid Bounding Box JSON format.', variant: 'destructive' });
            setIsSubmittingGeometry(false);
            return;
        }
    }

    const updateInput: AdminPartUpdateInput = {
      id: partId,
      volume_mm3: values.volume_mm3,
      surface_area_mm2: values.surface_area_mm2,
      bbox: parsedBbox,
      preview_url: values.preview_url,
    };
    const { error } = await updatePartByAdmin(updateInput);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Part geometry updated successfully!', variant: 'success' });
      fetchPartData(); // Re-fetch to update local state
    }
    setIsSubmittingGeometry(false);
  };

  const handleDeletePart = async () => {
    if (!part) return;
    if (!confirm('Are you sure you want to delete this part? This will also delete the associated file from storage. This action cannot be undone.')) {
      return;
    }
    setIsDeletingPart(true);
    const { error } = await deletePartByAdmin(partId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Part and associated files deleted successfully.', variant: 'success' });
      router.push('/admin/parts'); // Redirect to parts list
    }
    setIsDeletingPart(false);
  };

  const handleDownloadOriginalFile = async () => {
    if (!part?.file_url) {
      toast({ title: 'Info', description: 'No original file URL available for download.', variant: 'default' });
      return;
    }
    const { data: signedUrl, error } = await getSignedUrlForPart(part.file_url);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  // Helper function to re-fetch all data after a submission
  const fetchPartData = async () => {
    setLoading(true);
    const { data, error } = await getPartDetailsForAdmin(partId);
    if (data) {
        setPart(data as FullPartDetail);
        statusForm.reset({ status: data.status || 'uploaded' });
        geometryForm.reset({
            volume_mm3: data.volume_mm3 || undefined,
            surface_area_mm2: data.surface_area_mm2 || undefined,
            bbox: data.bbox ? JSON.stringify(data.bbox, null, 2) : '',
            preview_url: data.preview_url || '',
        });
        if (data.preview_url) {
            const { data: signedUrl } = await getSignedUrlForPart(data.preview_url);
            setPreviewImageUrl(signedUrl || null);
        } else {
            setPreviewImageUrl(null);
        }
    } else if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        router.replace('/admin/parts?error=PartNotFound');
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

  if (!part) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Part not found or inaccessible.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Package className="mr-3 h-7 w-7" /> {part.file_name}
        </h2>
        <Button variant="destructive" size="sm" onClick={handleDeletePart} disabled={isDeletingPart}>
          {isDeletingPart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete Part</span>
        </Button>
      </div>

      {/* Part Overview and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Part Overview</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              General details for {part.file_name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <p><span className="font-semibold">File Name:</span> {part.file_name}</p>
              <p><span className="font-semibold">File Extension:</span> {part.file_ext}</p>
              <p><span className="font-semibold">Size:</span> {(part.size_bytes / (1024 * 1024)).toFixed(2)} MB</p>
              <p><span className="font-semibold">Uploaded On:</span> {format(new Date(part.created_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
              <p><span className="font-semibold">Last Updated:</span> {format(new Date(part.updated_at || new Date()), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Owner: {' '}
                <Link href={`/admin/users/${part.profiles?.id}`} className="text-blue-600 hover:underline">
                    {part.profiles?.full_name || part.profiles?.email || 'N/A'} <ExternalLink className="inline h-3 w-3 ml-1" />
                </Link> ({part.profiles?.role})
              </p>

              {/* Status Update Form */}
              <Form {...statusForm}>
                <form onSubmit={statusForm.handleSubmit(handleStatusSubmit)} className="space-y-2 mt-4">
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <div className="flex gap-2 items-center">
                      <Select onValueChange={statusForm.setValue('status')} value={statusForm.watch('status')} disabled={isSubmittingStatus}>
                        <FormControl>
                          <SelectTrigger className="w-[200px] rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          {availableStatuses.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize dark:text-gray-200">
                              {status.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="submit" size="sm" disabled={isSubmittingStatus} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                        {isSubmittingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        {/* Part Preview */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <EyeIcon className="mr-2 h-5 w-5" /> Part Preview
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Visual representation of the uploaded part.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex items-center justify-center">
              {previewImageUrl ? (
                <img src={previewImageUrl} alt={`Preview of ${part.file_name}`} className="object-contain w-full h-full" />
              ) : (
                <div className="text-gray-400 dark:text-gray-500 text-center">
                    <Shapes className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No preview available.</p>
                    <p className="text-xs mt-1">Requires CAD processing to generate.</p>
                </div>
              )}
            </div>
            {part.preview_url && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center break-all">
                    Preview URL: {part.preview_url}
                </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* Geometry and CAD Processing Data */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FlaskConical className="mr-2 h-5 w-5" /> Geometry & Processing Data
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Automatically extracted CAD properties and manual overrides.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...geometryForm}>
            <form onSubmit={geometryForm.handleSubmit(handleGeometrySubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={geometryForm.control}
                  name="volume_mm3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume (mm³)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" placeholder="0.00" {...field}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={geometryForm.control}
                  name="surface_area_mm2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface Area (mm²)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" placeholder="0.00" {...field}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={geometryForm.control}
                name="bbox"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bounding Box (JSON)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='{"x_min": 0, "y_min": 0, "z_min": 0, "x_max": 10, "y_max": 10, "z_max": 10}' {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={geometryForm.control}
                name="preview_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preview Image URL (Internal Path)</FormLabel>
                    <FormControl>
                      <Input placeholder="parts/user-id/preview-uuid.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmittingGeometry} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                {isSubmittingGeometry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Geometry'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator className="my-8 dark:bg-gray-700" />

      {/* File Actions */}
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <DownloadIcon className="mr-2 h-5 w-5" /> File Actions
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Manage the associated files for this part.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={handleDownloadOriginalFile} disabled={!part.file_url} className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800">
            <DownloadIcon className="mr-2 h-4 w-4" /> Download Original CAD
          </Button>
          {previewImageUrl && (
            <a href={previewImageUrl} target="_blank" rel="noopener noreferrer" download={`${part.file_name}-preview.png`} className="no-underline">
                <Button variant="outline" className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    <DownloadIcon className="mr-2 h-4 w-4" /> Download Preview Image
                </Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
