// app/admin/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress'; // Assuming shadcn/ui progress component
import {
  DollarSign,
  BarChart,
  Target,
  MailWarning,
  MessageSquare,
  UploadCloud,
  Loader2,
  Hourglass,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Info
} from 'lucide-react';
import { fetchAdminDashboardData } from '@/actions/admin';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// Helper to determine badge variant based on quote status (same as /quotes page)
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'outline'; // Default outline for drafts
    case 'sent':
      return 'default'; // Primary for sent
    case 'accepted':
      return 'secondary'; // Green for accepted
    case 'rejected':
    case 'expired':
    case 'abandoned':
      return 'destructive'; // Red for negative statuses
    case 'paid':
    case 'in_production':
    case 'completed':
      return 'success'; // Success for positive statuses (assuming a 'success' variant exists or define one)
    default:
      return 'ghost'; // Fallback
  }
};


export default async function AdminDashboardPage() {
  const { data, error } = await fetchAdminDashboardData();

  if (error) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Error loading admin dashboard: {error}
      </div>
    );
  }

  const { kpis, feeds } = data!; // Assert non-null after error check

  const totalQuotes = kpis.quotesByStatus.reduce((sum, item: any) => sum + (item.count || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Admin Dashboard
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quotes by Status */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Quotes by Status</CardTitle>
            <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalQuotes} Total</div>
            <div className="space-y-1 mt-3">
              {kpis.quotesByStatus.map((item: any) => (
                <div key={item.status} className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
                  <span className="capitalize">{item.status?.replace(/_/g, ' ')}:</span>
                  <Badge variant={getStatusBadgeVariant(item.status)}>{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue 30 Days */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Revenue (30 Days)</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${kpis.revenue30d.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From completed payments</p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Conversion Rate (30 Days)</CardTitle>
            <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpis.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quotes accepted/paid vs. created</p>
          </CardContent>
        </Card>

        {/* Abandoned Funnel */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Abandoned Funnel</CardTitle>
            <MailWarning className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.abandonedFunnel.totalAbandoned} Total</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {kpis.abandonedFunnel.convertedAbandoned} converted ({kpis.abandonedFunnel.conversionRate.toFixed(1)}%)
            </p>
            <Progress value={kpis.abandonedFunnel.conversionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Messages */}
        <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Recent Messages</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Latest communications across all quotes.</CardDescription>
          </CardHeader>
          <CardContent>
            {feeds.recentMessages.length > 0 ? (
              <ul className="space-y-4">
                {feeds.recentMessages.map((msg: any) => (
                  <li key={msg.id} className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">
                        <span className="font-medium">{msg.profiles?.full_name || msg.profiles?.email || 'N/A'}</span> ({msg.sender_role})
                        {' '} <Link href={`/admin/quotes/${msg.quotes?.id}`} className="text-blue-600 hover:underline">
                        on Quote #{msg.quotes?.id?.substring(0, 8)}...
                        </Link>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{msg.content}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(parseISO(msg.created_at || new Date().toISOString()), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No recent messages.</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Uploads & Workload */}
        <div className="space-y-6">
          <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Latest Uploads</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Recently uploaded CAD files.</CardDescription>
            </CardHeader>
            <CardContent>
              {feeds.latestUploads.length > 0 ? (
                <ul className="space-y-3">
                  {feeds.latestUploads.map((part: any) => (
                    <li key={part.id} className="flex items-start space-x-3">
                      <UploadCloud className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium line-clamp-1">{part.file_name}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          by {part.profiles?.full_name || part.profiles?.email || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(parseISO(part.created_at || new Date().toISOString()), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No recent uploads.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Current Workload</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Active quotes requiring attention.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Hourglass className="h-6 w-6 text-orange-500" />
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {feeds.currentWorkload}
                </span>
                <span className="text-lg text-gray-600 dark:text-gray-400">Quotes in progress</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Includes quotes in 'sent', 'accepted', and 'in_production' statuses.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
