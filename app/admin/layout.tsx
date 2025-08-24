// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Building2,
  Settings,
  Euro,
  ClipboardList,
  MailWarning,
  PlusCircle,
  Shapes,
  Palette,
  Ruler,
  FormInput,
  BellRing
} from 'lucide-react';
import { getUserAndProfile, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  // Middleware should handle this, but an extra check for type safety and direct access
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard'); // Redirect unauthorized users to customer dashboard
  }

  // Admin navigation items
  const adminNavItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/quotes', icon: FileText, label: 'Quotes' },
    { href: '/admin/parts', icon: Package, label: 'Parts Gallery' },
    { href: '/admin/customers', icon: Building2, label: 'Customers' },
    { href: '/admin/users', icon: Users, label: 'Users & Roles' },
    { href: '/admin/payments', icon: Euro, label: 'Payments' },
    { href: '/admin/abandoned', icon: MailWarning, label: 'Abandoned' },
    {
      label: 'Catalog',
      items: [
        { href: '/admin/materials', icon: Shapes, label: 'Materials' },
        { href: '/admin/finishes', icon: Palette, label: 'Finishes' },
        { href: '/admin/tolerances', icon: Ruler, label: 'Tolerances' },
      ],
    },
    { href: '/admin/forms', icon: FormInput, label: 'Custom Forms' },
    // { href: '/admin/settings', icon: Settings, label: 'Settings' }, // Future global settings
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            Admin Panel
          </div>
          <Separator className="dark:bg-gray-700" />
          <nav className="space-y-2">
            {adminNavItems.map((item) => {
              if ('items' in item) {
                // Render a group with sub-items
                return (
                  <div key={item.label} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-3 py-2">
                      {item.label}
                    </h3>
                    {item.items.map((subItem) => (
                      <Link key={subItem.href} href={subItem.href}>
                        <Button variant="ghost" className="w-full justify-start text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md py-2 px-3 transition-colors duration-200 ease-in-out">
                          <subItem.icon className="mr-3 h-5 w-5" />
                          {subItem.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                );
              } else {
                // Render a single item
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" className="w-full justify-start text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md py-2 px-3 transition-colors duration-200 ease-in-out">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              }
            })}
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
            Admin Panel
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
