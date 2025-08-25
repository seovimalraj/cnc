// app/api/cad-process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedUrlForPart, updatePartByAdmin, AdminPartUpdateInput } from '@/actions/part';
import { getUserAndProfile } from '@/lib/auth'; // Ensure this path is correct

/**
 * Handles requests to trigger CAD processing for a given part.
 * This API route acts as a backend service to interface with external CAD APIs.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate and Authorize: Ensure only authorized admins/staff can trigger CAD processing.
  try {
    const { user, profile } = await getUserAndProfile();
    if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Staff role required.' }, { status: 403 });
    }
  } catch (authError) {
    console.error('Authentication error in CAD processing API:', authError);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  const { partId } = await req.json();

  if (!partId) {
    return NextResponse.json({ error: 'Part ID is required.' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    // Update part status to 'processing' immediately to provide user feedback
    const initialUpdate: AdminPartUpdateInput = {
      id: partId,
      status: 'processing',
    };
    await updatePartByAdmin(initialUpdate); // This will revalidate the admin part page

    // 2. Get a secure, temporary signed URL for the CAD file from Supabase Storage
    const { data: partDetails, error: fetchPartError } = await supabase
      .from('parts')
      .select('file_url, owner_id')
      .eq('id', partId)
      .single();

    if (fetchPartError || !partDetails?.file_url) {
      console.error(`Error fetching part file_url for ${partId}:`, fetchPartError);
      return NextResponse.json({ error: 'Part file not found.' }, { status: 404 });
    }

    const { data: signedUrl, error: signedUrlError } = await getSignedUrlForPart(partDetails.file_url);

    if (signedUrlError || !signedUrl) {
      console.error(`Error generating signed URL for part ${partId}:`, signedUrlError);
      return NextResponse.json({ error: 'Failed to get signed URL for part file.' }, { status: 500 });
    }

    // --- 3. Simulate External CAD API Call ---
    console.log(`Simulating call to external CAD API for part ${partId} with URL: ${signedUrl}`);
    // In a real application, you would make an HTTP POST request to your chosen CAD vendor's API:
    /*
    const externalApiResponse = await fetch('https://cad-api.example.com/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXTERNAL_CAD_API_KEY}`, // Use a secure API key
      },
      body: JSON.stringify({
        file_url: signedUrl,
        part_id: partId, // Pass your internal part ID for identification in the webhook
        webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cad-webhook`, // Your webhook endpoint for results
      }),
    });

    if (!externalApiResponse.ok) {
      const errorData = await externalApiResponse.json();
      console.error('External CAD API error:', errorData);
      // If the external API fails, update the part status to 'error'
      const errorUpdate: AdminPartUpdateInput = { id: partId, status: 'error' };
      await updatePartByAdmin(errorUpdate);
      return NextResponse.json({ error: 'External CAD API call failed.' }, { status: 500 });
    }

    const externalApiResult = await externalApiResponse.json();
    console.log('External CAD API initiated:', externalApiResult);
    // You might return here and wait for the webhook to update the final status/data.
    */

    // Simulate results after a delay, as if from a webhook
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulates external processing time

    // --- 4. Simulate Receiving Results (or a webhook would do this) ---
    // In a production system, a dedicated webhook endpoint (`/api/cad-webhook`)
    // would receive the processed data from the external CAD API. For this simulation,
    // we'll directly update the part here after the simulated delay.
    const simulatedGeometryData = {
      volume_mm3: parseFloat((Math.random() * 10000 + 1000).toFixed(4)),
      surface_area_mm2: parseFloat((Math.random() * 5000 + 500).toFixed(4)),
      bbox: {
        x_min: parseFloat((Math.random() * -10).toFixed(2)),
        y_min: parseFloat((Math.random() * -10).toFixed(2)),
        z_min: parseFloat((Math.random() * -10).toFixed(2)),
        x_max: parseFloat((Math.random() * 100 + 10).toFixed(2)),
        y_max: parseFloat((Math.random() * 80 + 10).toFixed(2)),
        z_max: parseFloat((Math.random() * 60 + 10).toFixed(2)),
      },
      // Example preview URL. In reality, the CAD API would generate and host this,
      // or send back a file that you upload to your storage.
      preview_url: `parts/${partDetails.owner_id}/${partId}-preview-${Date.now()}.png`,
    };

    const finalUpdate: AdminPartUpdateInput = {
      id: partId,
      status: 'processed', // Mark as successfully processed
      ...simulatedGeometryData, // Apply simulated geometry data
    };
    await updatePartByAdmin(finalUpdate); // Update the database and revalidate UI

    return NextResponse.json({ message: 'CAD processing initiated/simulated successfully.', partId }, { status: 200 });

  } catch (error: any) {
    console.error(`Server error triggering CAD processing for part ${partId}:`, error);
    // If an error occurs, attempt to set the part status to 'error'
    try {
      const errorUpdate: AdminPartUpdateInput = { id: partId, status: 'error' };
      await updatePartByAdmin(errorUpdate);
    } catch (e) {
      console.error('Failed to set part status to error during error handling:', e);
    }
    return NextResponse.json({ error: error.message || 'Internal server error during CAD processing.' }, { status: 500 });
  }
}
