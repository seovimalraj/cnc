// components/upload/PartDropzone.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileIcon, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { fileSchema } from '@/lib/validators/part';
import { z } from 'zod';

interface PartDropzoneProps {
  onUploadSuccess: (partId: string) => void;
  // Function to call for anonymous upload success, passing the file_url
  onAnonymousUploadSuccess?: (fileUrl: string) => void;
  isAnonymous?: boolean;
}

export function PartDropzone({ onUploadSuccess, onAnonymousUploadSuccess, isAnonymous = false }: PartDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((err: { code: string; message: string }) => {
          toast({
            title: `File Rejected: ${file.name}`,
            description: err.message,
            variant: 'destructive',
          });
        });
      });
      setFile(null); // Clear any previously selected file if a new one is rejected
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      try {
        fileSchema.parse(selectedFile); // Validate with Zod
        setFile(selectedFile);
        toast({
          title: 'File Selected',
          description: `${selectedFile.name} is ready for upload.`,
          variant: 'default',
        });
      } catch (e: any) {
        toast({
          title: 'File Validation Error',
          description: e.errors[0]?.message || 'Invalid file.',
          variant: 'destructive',
        });
        setFile(null);
      }
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/octet-stream': ['.stl', '.step', '.stp', '.iges', '.igs'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please drag and drop a CAD file or click to select one.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('isAnonymous', isAnonymous.toString());

    try {
      const response = await fetch('/api/upload/part', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      const result = await response.json();

      toast({
        title: 'Upload Successful',
        description: `${file.name} uploaded successfully!`,
        variant: 'success',
      });

      setFile(null); // Clear file after successful upload
      if (isAnonymous && onAnonymousUploadSuccess) {
        onAnonymousUploadSuccess(result.part.file_url);
      } else {
        onUploadSuccess(result.part.id);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'An unexpected error occurred during upload.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'}
          hover:border-blue-400 dark:hover:border-blue-600`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600 dark:text-blue-400 text-lg font-medium">Drop the CAD file here ...</p>
        ) : (
          <div className="flex flex-col items-center text-center text-gray-600 dark:text-gray-400">
            <FileIcon className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500" />
            <p className="text-lg font-medium">Drag 'n' drop a CAD file here, or click to select</p>
            <p className="text-sm mt-1">(Only .stl, .step, .stp, .iges, .igs files, max 50MB)</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <FileIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            <span className="text-gray-800 dark:text-white font-medium">{file.name}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={loading}>
            <XCircle className="h-5 w-5 text-red-500 hover:text-red-600" />
          </Button>
        </div>
      )}

      <Button
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
        onClick={handleUpload}
        disabled={!file || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          'Upload CAD File'
        )}
      </Button>
    </div>
  );
}
