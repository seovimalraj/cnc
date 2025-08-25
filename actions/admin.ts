// actions/admin.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { format, subDays } from 'date-fns';

/**
 * Server Action to fetch data for the Admin Dashboard KPIs and Feeds.
 * This aggregates various metrics and recent activities.
 */
export async function fetchAdminDashboardData() {
  const { user, profile } = await getUserAndProfile();
  const supabase = createServerSupabase();

  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    return { error: 'Unauthorized: Admin or Staff role required.' };
  }

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  try {
    // --- KPIs ---

    // 1. Quotes by Status
    const { data: quotesByStatus, error: statusError } = await supabase
      .from('quotes')
      .select('status, count')
      .order('status', { ascending: true }); // Supabase automatically aggregates count for group by

    if (statusError) console.error('Error fetching quotes by status:', statusError);


    // 2. Revenue 30 days
    const { data: revenueData, error: revenueError } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', thirtyDaysAgoIso)
      .eq('status', 'completed'); // Only count completed payments

    if (revenueError) console.error('Error fetching revenue:', revenueError);

    const revenue30d = revenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;


    // 3. Conversion Rate (Quotes created vs. Quotes accepted/paid in 30 days)
    const { data: quotesCreated30d, error: createdQuotesError } = await supabase
      .from('quotes')
      .select('id, status')
      .gte('created_at', thirtyDaysAgoIso);

    if (createdQuotesError) console.error('Error fetching created quotes for conversion:', createdQuotesError);

    const totalQuotes30d = quotesCreated30d?.length || 0;
    const acceptedOrPaidQuotes30d = quotesCreated30d?.filter(q => ['accepted', 'paid', 'completed'].includes(q.status || '')).length || 0;
    const conversionRate = totalQuotes30d > 0 ? (acceptedOrPaidQuotes30d / totalQuotes30d) * 100 : 0;


    // 4. Abandoned Funnel (Total abandoned vs. converted)
    const { data: abandonedQuotesCount, error: abandonedCountError } = await supabase
      .from('abandoned_quotes')
      .select('id', { count: 'exact' });

    if (abandonedCountError) console.error('Error fetching abandoned quotes count:', abandonedCountError);

    const { data: claimedAbandonedCount, error: claimedAbandonedError } = await supabase
      .from('abandoned_quotes')
      .select('id', { count: 'exact' })
      .eq('is_claimed', true);

    if (claimedAbandonedError) console.error('Error fetching claimed abandoned quotes count:', claimedAbandonedError);

    const totalAbandoned = abandonedQuotesCount?.count || 0;
    const convertedAbandoned = claimedAbandonedCount?.count || 0;
    const abandonedConversionRate = totalAbandoned > 0 ? (convertedAbandoned / totalAbandoned) * 100 : 0;


    // --- Feeds ---

    // 1. Recent Messages (latest 5)
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_role,
        quotes (id, status),
        profiles (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) console.error('Error fetching recent messages:', messagesError);


    // 2. Latest Uploads (parts, latest 5)
    const { data: latestUploads, error: uploadsError } = await supabase
      .from('parts')
      .select(`
        id,
        file_name,
        created_at,
        profiles (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (uploadsError) console.error('Error fetching latest uploads:', uploadsError);


    // 3. Workload (simple heuristic: number of 'sent' or 'in_production' quotes)
    const { data: workloadQuotes, error: workloadError } = await supabase
      .from('quotes')
      .select('id', { count: 'exact' })
      .in('status', ['sent', 'accepted', 'in_production']);

    if (workloadError) console.error('Error fetching workload:', workloadError);

    const currentWorkload = workloadQuotes?.count || 0;


    return {
      data: {
        kpis: {
          quotesByStatus: quotesByStatus || [],
          revenue30d: revenue30d,
          conversionRate: conversionRate,
          abandonedFunnel: {
            totalAbandoned,
            convertedAbandoned,
            conversionRate: abandonedConversionRate,
          },
        },
        feeds: {
          recentMessages: recentMessages || [],
          latestUploads: latestUploads || [],
          currentWorkload: currentWorkload,
        },
      },
    };

  } catch (error: any) {
    console.error('An unexpected error occurred in fetchAdminDashboardData:', error);
    return { error: error.message || 'Failed to fetch dashboard data.' };
  }
}
