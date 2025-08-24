// components/forms/DynamicForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming shadcn/ui textarea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming shadcn/ui checkbox
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Assuming shadcn/ui radio-group
import { Button } from '@/components/ui/button';
import { CustomFormDefinition, customFormResponseSchema } from '@/lib/validators/form';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface DynamicFormProps {
  formDefinition: CustomFormDefinition;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
}

export function DynamicForm({ formDefinition, onSubmit, isSubmitting }: DynamicFormProps) {
  const { toast } = useToast();

  // Dynamically create a Zod schema for the form based on formDefinition
  const dynamicSchema = useMemo(() => {
    const fieldsSchema: Record<string, z.ZodTypeAny> = {};
    formDefinition.fields.forEach(field => {
      let fieldValidator: z.ZodTypeAny = z.any(); // Default to any, then refine

      switch (field.type) {
        case 'text':
        case 'textarea':
          fieldValidator = z.string();
          break;
        case 'number':
          fieldValidator = z.number();
          if (field.min !== undefined) fieldValidator = fieldValidator.min(field.min, `Must be at least ${field.min}`);
          if (field.max !== undefined) fieldValidator = fieldValidator.max(field.max, `Must be at most ${field.max}`);
          break;
        case 'select':
        case 'radio':
          fieldValidator = z.string().refine(val => field.options?.includes(val), 'Invalid option selected.');
          break;
        case 'checkbox':
          fieldValidator = z.boolean();
          break;
        default:
          console.warn(`Unsupported field type: ${field.type}`);
          break;
      }

      if (field.required) {
        fieldValidator = fieldValidator.pipe(z.string().min(1, 'This field is required.')).or(z.number().min(0, 'This field is required.')).or(z.boolean().refine(val => val === true, 'This field is required.'));
      }
      fieldsSchema[field.id] = fieldValidator;
    });
    return z.object(fieldsSchema);
  }, [formDefinition]);


  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: formDefinition.fields.reduce((acc, field) => {
      if (field.defaultValue !== undefined) {
        acc[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        acc[field.id] = false; // Default for checkboxes
      } else if (field.type === 'number') {
        acc[field.id] = 0; // Default for numbers
      } else {
        acc[field.id] = '';
      }
      return acc;
    }, {} as Record<string, any>),
  });

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      // Validate the response data against the generic schema
      customFormResponseSchema.parse(values);
      await onSubmit(values);
    } catch (e: any) {
      const errorMessage = e instanceof z.ZodError ? e.errors[0]?.message : e.message || 'An unexpected error occurred.';
      toast({
        title: 'Submission Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {formDefinition.fields.map((field) => (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  {field.type === 'text' && (
                    <Input {...formField} placeholder={field.placeholder} />
                  )}
                  {field.type === 'textarea' && (
                    <Textarea {...formField} placeholder={field.placeholder} />
                  )}
                  {field.type === 'number' && (
                    <Input
                      type="number"
                      {...formField}
                      onChange={(e) => formField.onChange(e.target.valueAsNumber)}
                      placeholder={field.placeholder}
                      min={field.min}
                      max={field.max}
                    />
                  )}
                  {field.type === 'select' && field.options && (
                    <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                      <label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {field.placeholder || field.label}
                      </label>
                    </div>
                  )}
                  {field.type === 'radio' && field.options && (
                    <RadioGroup
                      onValueChange={formField.onChange}
                      defaultValue={formField.value}
                      className="flex flex-col space-y-1"
                    >
                      {field.options.map((option) => (
                        <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={option} />
                          </FormControl>
                          <FormLabel className="font-normal">{option}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Form'
          )}
        </Button>
      </form>
    </Form>
  );
}
