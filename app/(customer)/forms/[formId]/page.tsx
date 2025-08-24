// app/(customer)/forms/[formId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileText } from 'lucide-react';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { fetchCustomFormById, submitCustomFormResponse } from '@/actions/form';
import { CustomFormDefinition, CustomFormResponseInput } from '@/lib/validators/form';
import { notFound } from 'next/navigation'; // Only works in Server Components, simulate client-side


export default function CustomerFormPage() {
  const params = useParams();
  const formId = params.formId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [formDefinition, setFormDefinition] = useState<CustomFormDefinition | null>(null);
  const [formTitle, setFormTitle] = useState<string>('Loading Form...');
  const [formDescription, setFormDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchCustomFormById(formId);

      if (fetchError) {
        console.error('Failed to load form:', fetchError);
        setError(fetchError || 'Failed to load form. It might not exist or be active.');
        setLoading(false);
        // In a client component, you can't use Next.js's notFound directly.
        // You would typically redirect or show an error message.
        if (fetchError === 'Form not found or not active.') {
            // Simulate notFound behavior if form is genuinely missing or inaccessible
            router.replace('/404'); // Or redirect to a generic error page
        }
        return;
      }

      if (data?.schema) {
        setFormDefinition(data.schema);
        setFormTitle(data.schema.title);
        setFormDescription(data.schema.description || '');
      } else {
        setError('Form definition is empty or invalid.');
      }
      setLoading(false);
    }

    if (formId) {
      loadForm();
    }
  }, [formId, router, toast]);

  const handleSubmitForm = async (responseData: CustomFormResponseInput) => {
    setIsSubmitting(true);
    const { data, error: submitError } = await submitCustomFormResponse(formId, responseData);

    if (submitError) {
      toast({
        title: 'Form Submission Failed',
        description: submitError,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Form Submitted!',
        description: 'Your response has been successfully recorded.',
        variant: 'success',
      });
      // Optionally redirect after submission or show a success message
      router.push('/dashboard'); // Example: redirect to dashboard
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 max-w-2xl mx-auto p-6 text-center">
        <CardTitle className="text-2xl text-red-600 dark:text-red-400">Error</CardTitle>
        <CardDescription className="mt-4 text-gray-700 dark:text-gray-300">
          {error}
        </CardDescription>
        <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
      </Card>
    );
  }

  if (!formDefinition) {
    return (
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 max-w-2xl mx-auto p-6 text-center">
        <CardTitle className="text-2xl text-yellow-600 dark:text-yellow-400">No Form Found</CardTitle>
        <CardDescription className="mt-4 text-gray-700 dark:text-gray-300">
          The form you are looking for could not be displayed.
        </CardDescription>
        <Button onClick={() => router.push('/dashboard')} className="mt-6">Go to Dashboard</Button>
      </Card>
    );
  }


  return (
    <div className="container mx-auto p-6 space-y-8 max-w-3xl">
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FileText className="mr-3 h-7 w-7" /> {formTitle}
          </CardTitle>
          {formDescription && (
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {formDescription}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <DynamicForm
            formDefinition={formDefinition}
            onSubmit={handleSubmitForm}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
