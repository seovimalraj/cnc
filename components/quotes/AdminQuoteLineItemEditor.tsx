// components/quotes/AdminQuoteLineItemEditor.tsx
// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Edit, Save, PlusCircle, Trash2 } from 'lucide-react';
import { Database } from '@/types/supabase';
import { updateQuoteLineItem, addQuoteLineItem, deleteQuoteLineItem } from '@/actions/quote'; // Import Server Actions
import { getMaterials, getFinishes, getTolerances } from '@/actions/catalog'; // To fetch catalog options
import { getMaterials as getCustomerMaterials, getFinishes as getCustomerFinishes, getTolerances as getCustomerTolerances } from '@/lib/pricing'; // Using pricing lib to fetch active, customer-visible catalog
import { createClient } from '@/lib/supabase/client'; // Client-side Supabase to fetch parts

type QuoteItem = Database['public']['Tables']['quote_items']['Row'] & {
  parts: Database['public']['Tables']['parts']['Row'] | null;
  materials: Database['public']['Tables']['materials']['Row'] | null;
  finishes: Database['public']['Tables']['finishes']['Row'] | null;
  tolerances: Database['public']['Tables']['tolerances']['Row'] | null;
};

// Define form schema for editing a line item
const lineItemEditSchema = z.object({
  material_id: z.string().uuid('Please select a valid material.'),
  finish_id: z.string().uuid('Please select a valid finish.'),
  tolerance_id: z.string().uuid('Please select a valid tolerance.'),
  quantity: z.number().int().positive('Quantity must be at least 1.'),
  unit_price: z.number().nonnegative('Unit price cannot be negative.').optional(), // Admin can manually adjust
  line_total: z.number().nonnegative('Line total cannot be negative.').optional(), // Admin can manually adjust
});

type LineItemEditFormValues = z.infer<typeof lineItemEditSchema>;

interface AdminQuoteLineItemEditorProps {
  quoteId: string;
  lineItem?: QuoteItem; // Optional, if provided, it's an edit operation
  onUpdateSuccess: () => void; // Callback to refresh parent list
  isAddingNew?: boolean;
}

export function AdminQuoteLineItemEditor({ quoteId, lineItem, onUpdateSuccess, isAddingNew = false }: AdminQuoteLineItemEditorProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [materials, setMaterials] = useState<Database['public']['Tables']['materials']['Row'][]>([]);
  const [finishes, setFinishes] = useState<Database['public']['Tables']['finishes']['Row'][]>([]);
  const [tolerances, setTolerances] = useState<Database['public']['Tables']['tolerances']['Row'][]>([]);
  const [parts, setParts] = useState<Database['public']['Tables']['parts']['Row'][]>([]); // Only for adding new item
  const [isSubmitting, setIsSubmitting] = useState(false);


  const form = useForm<LineItemEditFormValues & { part_id?: string }>({ // Add part_id for new item
    resolver: zodResolver(lineItemEditSchema.extend({
      part_id: isAddingNew ? z.string().uuid('Please select a part.').optional() : z.string().uuid().optional(),
    })),
    defaultValues: {
      material_id: lineItem?.material_id || '',
      finish_id: lineItem?.finish_id || '',
      tolerance_id: lineItem?.tolerance_id || '',
      quantity: lineItem?.quantity || 1,
      unit_price: lineItem?.unit_price || undefined,
      line_total: lineItem?.line_total || undefined,
      part_id: isAddingNew ? '' : lineItem?.part_id || '', // Only set default for existing or empty for new
    },
  });

  // Fetch catalog options (materials, finishes, tolerances)
  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true);
      // Admin should see all active/inactive items for full control
      const { data: materialsData, error: materialsError } = await getMaterials();
      const { data: finishesData, error: finishesError } = await getFinishes();
      const { data: tolerancesData, error: tolerancesError } = await getTolerances();

      if (materialsError) console.error('Error fetching materials for editor:', materialsError);
      if (finishesError) console.error('Error fetching finishes for editor:', finishesError);
      if (tolerancesError) console.error('Error fetching tolerances for editor:', tolerancesError);

      setMaterials(materialsData || []);
      setFinishes(finishesData || []);
      setTolerances(tolerancesData || []);

      if (isAddingNew) {
          const supabase = createClient(); // Client-side Supabase for parts
          const { data: partsData, error: partsError } = await supabase.from('parts').select('id, file_name').limit(100);
          if (partsError) console.error('Error fetching parts for adding new item:', partsError);
          setParts(partsData || []);
      }

      setLoadingOptions(false);
    }
    fetchOptions();
  }, [isAddingNew]);

  useEffect(() => {
    if (dialogOpen && lineItem && !isAddingNew) {
      form.reset({
        material_id: lineItem.material_id || '',
        finish_id: lineItem.finish_id || '',
        tolerance_id: lineItem.tolerance_id || '',
        quantity: lineItem.quantity || 1,
        unit_price: lineItem.unit_price || undefined,
        line_total: lineItem.line_total || undefined,
        part_id: lineItem.part_id || '',
      });
    } else if (dialogOpen && isAddingNew) {
      form.reset({ // Reset for new item creation
        part_id: '',
        material_id: '',
        finish_id: '',
        tolerance_id: '',
        quantity: 1,
        unit_price: undefined,
        line_total: undefined,
      });
    }
  }, [dialogOpen, lineItem, isAddingNew, form]);

  const onSubmit = async (values: LineItemEditFormValues & { part_id?: string }) => {
    setIsSubmitting(true);
    let result;
    if (isAddingNew) {
        if (!values.part_id) {
            toast({title: "Error", description: "Please select a part for the new line item.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }
        result = await addQuoteLineItem(quoteId, {
            part_id: values.part_id,
            material_id: values.material_id,
            finish_id: values.finish_id,
            tolerance_id: values.tolerance_id,
            quantity: values.quantity,
        });
    } else if (lineItem) {
      result = await updateQuoteLineItem(lineItem.id, {
        material_id: values.material_id,
        finish_id: values.finish_id,
        tolerance_id: values.tolerance_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        line_total: values.line_total,
        // Optionally, recalculate pricing breakdown here if any manual fields change
      });
    }

    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Line item ${isAddingNew ? 'added' : 'updated'} successfully!`, variant: 'success' });
      onUpdateSuccess();
      setDialogOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDeleteItem = async () => {
    if (!lineItem || isAddingNew) return;
    if (!confirm('Are you sure you want to delete this line item?')) return;

    setIsSubmitting(true);
    const { error } = await deleteQuoteLineItem(lineItem.id);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Line item deleted successfully.', variant: 'success' });
      onUpdateSuccess();
      setDialogOpen(false);
    }
    setIsSubmitting(false);
  };


  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {isAddingNew ? (
          <Button variant="outline" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="sr-only">Edit Line Item</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {isAddingNew ? 'Add New Line Item' : 'Edit Line Item'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {isAddingNew ? 'Add a new part and its specifications to this quote.' : `Edit details for part: ${lineItem?.parts?.file_name || 'N/A'}.`}
          </DialogDescription>
        </DialogHeader>
        {loadingOptions ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              {isAddingNew && (
                <FormField
                  control={form.control}
                  name="part_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a part" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parts.map(part => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.file_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="material_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materials.map(material => (
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
                name="finish_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finish</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select finish" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {finishes.map(finish => (
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
                name="tolerance_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tolerance</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tolerance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tolerances.map(tolerance => (
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
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (Override)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="Calculated automatically or override"
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="line_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Total (Override)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="Calculated automatically or override"
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex flex-col sm:flex-row-reverse sm:space-x-2 sm:space-y-0 mt-4">
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isAddingNew ? 'Add Item' : 'Save Changes')}
                </Button>
                {!isAddingNew && (
                    <Button type="button" variant="destructive" onClick={handleDeleteItem} disabled={isSubmitting} className="sm:mr-auto mt-2 sm:mt-0">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                    </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting} className="mt-2 sm:mt-0 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
