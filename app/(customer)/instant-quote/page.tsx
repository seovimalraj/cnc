// app/(customer)/instant-quote/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { calculateInstantQuote, PricingInput, QuoteLineItemResult, PricingBreakdown } from '@/lib/pricing'; // Still used for type definitions
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, DollarSign, Calculator, Save, FilePlus2, Package } from 'lucide-react';
import { getInstantQuoteResult, calculateAndSaveDraftQuote } from '@/actions/quote'; // Import server actions


// Form schema for instant quote inputs
const formSchema = z.object({
  partId: z.string().uuid('Please select a valid part.'),
  materialId: z.string().uuid('Please select a material.'),
  finishId: z.string().uuid('Please select a finish.'),
  toleranceId: z.string().uuid('Please select a tolerance.'),
  quantity: z.number().int().positive('Quantity must be at least 1.'),
});

type InstantQuoteFormValues = z.infer<typeof formSchema>;

export default function InstantQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient(); // Client-side Supabase for data fetching (parts, catalog)

  const [parts, setParts] = useState<any[]>([]); // Using any for now, ideally Database['public']['Tables']['parts']['Row']
  const [materials, setMaterials] = useState<any[]>([]);
  const [finishes, setFinishes] = useState<any[]>([]);
  const [tolerances, setTolerances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteLineItemResult | null>(null);
  const [customerProfileId, setCustomerProfileId] = useState<string | null>(null);

  const form = useForm<InstantQuoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partId: '',
      materialId: '',
      finishId: '',
      toleranceId: '',
      quantity: 1,
    },
  });

  const selectedPartId = form.watch('partId');

  // Fetch initial data (parts, materials, finishes, tolerances)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use the instant quote feature.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }
      setCustomerProfileId(user.id); // Set profile ID for saving quotes

      // Fetch parts owned by the current user
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('id, file_name, status, volume_mm3, surface_area_mm2')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      const { data: finishesData, error: finishesError } = await supabase
        .from('finishes')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      const { data: tolerancesData, error: tolerancesError } = await supabase
        .from('tolerances')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (partsError) console.error('Error fetching parts:', partsError);
      if (materialsError) console.error('Error fetching materials:', materialsError);
      if (finishesError) console.error('Error fetching finishes:', finishesError);
      if (tolerancesError) console.error('Error fetching tolerances:', tolerancesError);

      setParts(partsData || []);
      setMaterials(materialsData || []);
      setFinishes(finishesData || []);
      setTolerances(tolerancesData || []);
      setLoading(false);

      // Pre-fill partId if present in URL query (e.g., from anonymous upload redirect)
      const partIdFromUrl = searchParams.get('partId');
      if (partIdFromUrl && partsData?.some(p => p.id === partIdFromUrl)) {
        form.setValue('partId', partIdFromUrl);
      } else if (partsData?.length > 0) {
        // If no URL partId, select the first available part
        form.setValue('partId', partsData[0].id);
      }
    }
    fetchData();
  }, [supabase, searchParams, form, router, toast]);


  // Handle quote calculation using the Server Action
  const handleCalculateQuote = async (values: InstantQuoteFormValues) => {
    setIsCalculating(true);
    setQuoteResult(null); // Clear previous result

    const pricingInput: PricingInput = {
      partId: values.partId,
      materialId: values.materialId,
      finishId: values.finishId,
      toleranceId: values.toleranceId,
      quantity: values.quantity,
      // region is determined server-side in the action
    };

    const result = await getInstantQuoteResult(pricingInput);

    if (result.data) {
      setQuoteResult(result.data);
      toast({
        title: 'Quote Calculated',
        description: `Total: ${result.data.pricing_breakdown.currency} ${result.data.line_total.toFixed(2)}`,
        variant: 'success',
      });
    } else {
      console.error('Client-side error in calculateInstantQuote:', result.error);
      toast({
        title: 'Quote Calculation Failed',
        description: result.error || 'Could not generate an instant quote. Please check your selections.',
        variant: 'destructive',
      });
    }
    setIsCalculating(false);
  };

  // Handle saving quote using the Server Action
  const handleSaveQuote = async () => {
    if (!quoteResult || !customerProfileId) {
      toast({
        title: 'Cannot Save Quote',
        description: 'Please calculate a quote and ensure you are logged in.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const formValues = form.getValues();
      const pricingInput: PricingInput = {
        partId: formValues.partId,
        materialId: formValues.materialId,
        finishId: formValues.finishId,
        toleranceId: formValues.toleranceId,
        quantity: formValues.quantity,
      };

      const result = await calculateAndSaveDraftQuote(pricingInput);

      if (result.data) {
        toast({
          title: 'Quote Saved',
          description: `Your draft quote #${result.data.quoteId?.substring(0, 8)} has been saved.`,
          variant: 'success',
        });
        router.push(`/quotes/${result.data.quoteId}`); // Redirect to the saved quote detail page
      } else {
        console.error('Client-side error in calculateAndSaveDraftQuote:', result.error);
        toast({
          title: 'Error Saving Quote',
          description: result.error || 'Failed to save the draft quote.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Unexpected error saving quote:', error);
      toast({
        title: 'Error Saving Quote',
        description: error.message || 'Failed to save the draft quote.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const selectedPart = useMemo(() => {
    return parts.find(p => p.id === selectedPartId);
  }, [parts, selectedPartId]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            Instant Quote
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Get an immediate price estimate for your CAD parts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCalculateQuote)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="partId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Part</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a part" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parts.length > 0 ? (
                            parts.map((part) => (
                              <SelectItem key={part.id} value={part.id}>
                                {part.file_name} ({part.status})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-parts" disabled>
                              No parts uploaded. <Link href="/upload" className="text-blue-600">Upload one!</Link>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="materialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finishId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finish</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a finish" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {finishes.map((finish) => (
                            <SelectItem key={finish.id} value={finish.id}>
                              {finish.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toleranceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tolerance</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a tolerance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tolerances.map((tolerance) => (
                            <SelectItem key={tolerance.id} value={tolerance.id}>
                              {tolerance.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full md:col-span-2 mt-4 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  disabled={isCalculating || !selectedPart}
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Quote
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Pricing Breakdown Card */}
      {quoteResult && (
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <DollarSign className="mr-2 h-6 w-6" /> Quote Summary
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Detailed breakdown of your instant quote.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Part:</span> {selectedPart?.file_name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Quantity:</span> {quoteResult.quantity}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Unit Price:</span>{' '}
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.unit_price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Material Cost:</span>{' '}
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.material_cost_total.toFixed(2)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Machining Cost:</span>{' '}
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.machining_cost_total.toFixed(2)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Finish Cost:</span>{' '}
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.finish_cost_total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal:</span>
                <span>
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.final_subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Tax ({((quoteResult.pricing_breakdown.tax_amount / Math.max(1, quoteResult.pricing_breakdown.final_subtotal)) * 100).toFixed(2)}%):</span>
                <span>
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.tax_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Shipping:</span>
                <span>
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.pricing_breakdown.shipping_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                <span>Total:</span>
                <span>
                  {quoteResult.pricing_breakdown.currency}{' '}
                  {quoteResult.line_total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSaveQuote}
              className="w-full mt-6 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Quote...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft Quote
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
