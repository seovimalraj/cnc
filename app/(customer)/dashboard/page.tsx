// app/(customer)/dashboard/page.tsx
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // shadcn/ui Card components
import Link from 'next/link';
import { format } from 'date-fns';

export default async function CustomerDashboardPage() {
  const supabase = createServerSupabase();
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    // This should ideally be caught by middleware or layout, but good for type safety
    return <div className="text-red-500">Error: User not authenticated.</div>;
  }

  // Fetch recent quotes
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, status, total, currency, created_at')
    .eq('customer_id', profile.id) // Assuming customer_id in quotes links to profile.id
    .order('created_at', { ascending: false })
    .limit(5);

  if (quotesError) {
    console.error('Error fetching recent quotes:', quotesError);
  }

  // Fetch recent messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, quote_id, content, created_at, sender_id')
    .in('quote_id', quotes?.map(q => q.id) || ['']) // Get messages for recent quotes
    .order('created_at', { ascending: false })
    .limit(5);

  if (messagesError) {
    console.error('Error fetching recent messages:', messagesError);
  }

  // Fetch recent parts
  const { data: parts, error: partsError } = await supabase
    .from('parts')
    .select('id, file_name, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (partsError) {
    console.error('Error fetching recent parts:', partsError);
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Welcome, {profile.full_name || profile.email}!
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Quotes Card */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Recent Quotes</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your latest quote requests and their statuses.</CardDescription>
          </CardHeader>
          <CardContent>
            {quotes && quotes.length > 0 ? (
              <ul className="space-y-2">
                {quotes.map((quote) => (
                  <li key={quote.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <Link href={`/quotes/${quote.id}`} className="block hover:underline">
                      <p className="text-gray-900 dark:text-white font-medium">Quote #{quote.id?.substring(0, 8)}...</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Status: <span className={`font-semibold ${
                          quote.status === 'accepted' ? 'text-green-600' :
                          quote.status === 'draft' ? 'text-blue-600' :
                          quote.status === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>{quote.status}</span></p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total: {quote.currency} {quote.total?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(quote.created_at || new Date()), 'MMM d, yyyy HH:mm')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent quotes found. <Link href="/instant-quote" className="text-blue-600 hover:underline">Start a new one!</Link></p>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages Card */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Recent Messages</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your latest communications regarding your quotes.</CardDescription>
          </CardHeader>
          <CardContent>
            {messages && messages.length > 0 ? (
              <ul className="space-y-2">
                {messages.map((message) => (
                  <li key={message.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <Link href={`/quotes/${message.quote_id}`} className="block hover:underline">
                      <p className="text-gray-900 dark:text-white font-medium">
                        Quote #{message.quote_id?.substring(0, 8)}...{' '}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({message.sender_id === user.id ? 'You' : 'Staff'})
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{message.content}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(message.created_at || new Date()), 'MMM d, yyyy HH:mm')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent messages.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Parts Card */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Recent Parts</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your recently uploaded or processed parts.</CardDescription>
          </CardHeader>
          <CardContent>
            {parts && parts.length > 0 ? (
              <ul className="space-y-2">
                {parts.map((part) => (
                  <li key={part.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <Link href={`/parts/${part.id}`} className="block hover:underline">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{part.file_name || 'Untitled Part'}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Status: <span className="font-semibold">{part.status}</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(part.created_at || new Date()), 'MMM d, yyyy HH:mm')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent parts found. <Link href="/upload" className="text-blue-600 hover:underline">Upload a new part!</Link></p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
