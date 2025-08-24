// app/(customer)/parts/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSignedUrl } from '@/lib/storage';
import { EyeIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { AspectRatio } from '@radix-ui/react-aspect-ratio'; // Used for consistent image sizing

// A simple Three.js viewer component for part previews (client-side)
// This will be a stub as a full CAD viewer is complex and outside this initial scope
function PartPreview3D({ fileUrl }: { fileUrl: string }) {
  // In a real application, you'd use @react-three/fiber and 'three'
  // to render the CAD model from `fileUrl` (after converting it to a renderable format).
  // For now, this is a placeholder.
  return (
    <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
      <EyeIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      <span className="absolute bottom-2 text-xs text-gray-500 dark:text-gray-400">
        3D Preview (Requires CAD processing & viewer implementation)
      </span>
    </div>
  );
}


export default async function CustomerPartsPage() {
  const supabase = createClient();
  const { user } = await getUserAndProfile();

  if (!user) {
    return <div className="text-red-500">Error: User not authenticated.</div>;
  }

  // Fetch parts owned by the current user
  const { data: parts, error: partsError } = await supabase
    .from('parts')
    .select('id, file_name, file_url, file_ext, size_bytes, created_at, preview_url, status')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (partsError) {
    console.error('Error fetching parts:', partsError);
    return <div className="text-red-500">Failed to load your parts: {partsError.message}</div>;
  }

  // Generate signed URLs for file_url and preview_url for display/download
  const partsWithSignedUrls = await Promise.all(
    parts.map(async (part) => {
      const { signedUrl: fileDownloadUrl } = await getSignedUrl('parts', part.file_url || '');
      // Only generate preview URL if a preview_url path exists
      const { signedUrl: previewImageUrl } = part.preview_url ? await getSignedUrl('parts', part.preview_url) : { signedUrl: null };

      return {
        ...part,
        fileDownloadUrl,
        previewImageUrl,
      };
    })
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            My Uploaded Parts
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Here you can view all the CAD files you've uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partsWithSignedUrls.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Preview</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partsWithSignedUrls.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="w-24 h-auto aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {part.previewImageUrl ? (
                            <img src={part.previewImageUrl} alt={`Preview of ${part.file_name}`} className="object-cover w-full h-full" />
                          ) : (
                            <PartPreview3D fileUrl={part.file_url || ''} /> // Placeholder or actual 3D viewer
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{part.file_name}</TableCell>
                      <TableCell>{(part.size_bytes / (1024 * 1024)).toFixed(2)} MB</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            part.status === 'uploaded' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            part.status === 'processed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                          {part.status}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(part.created_at || new Date()), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                            {part.fileDownloadUrl && (
                                <Link href={part.fileDownloadUrl} target="_blank" download={`${part.file_name || 'part'}${part.file_ext}`} passHref>
                                    <Button variant="outline" size="icon" className="group">
                                        <DownloadIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                        <span className="sr-only">Download</span>
                                    </Button>
                                </Link>
                            )}
                            <Link href={`/instant-quote?partId=${part.id}`} passHref>
                                <Button variant="outline" size="sm" className="group">
                                    <ReceiptText className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                    Get Quote
                                </Button>
                            </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              You haven't uploaded any parts yet. <Link href="/upload" className="text-blue-600 hover:underline">Upload your first part now!</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
