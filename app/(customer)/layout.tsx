// app/(customer)/layout.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, Upload, FileText, User, LayoutDashboard, MessageSquare, Package, ReceiptText, Settings } from 'lucide-react';
import { getUserAndProfile, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui Button
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Assuming shadcn/ui Avatar

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    redirect('/login'); // Redirect unauthenticated users
  }

  // Basic navigation items for the customer panel
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/upload', icon: Upload, label: 'Upload Part' },
    { href: '/parts', icon: Package, label: 'My Parts' },
    { href: '/instant-quote', icon: ReceiptText, label: 'Instant Quote' },
    { href: '/quotes', icon: FileText, label: 'My Quotes' },
    // Removed /forms/[formId] from here as it's dynamic, will be accessed via direct link
    { href: '/account', icon: Settings, label: 'Account Settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            CNC Portal
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" className="w-full justify-start text-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md py-2 px-3 transition-colors duration-200 ease-in-out">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile and Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                {profile.full_name || profile.email}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {profile.role}
              </span>
            </div>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              Logout
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Customer Portal
          </h1>
          {/* Add any header-specific elements here, e.g., notifications, search */}
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
