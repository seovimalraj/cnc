// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster'; // Assuming shadcn/ui toaster component

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CNC Portal',
  description: 'Customer and Admin Portal for CNC Machining Services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
        {children}
        <Toaster /> {/* Global toaster for notifications */}
      </body>
    </html>
  );
}
