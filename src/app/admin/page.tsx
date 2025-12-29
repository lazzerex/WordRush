import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import AdminDashboardClient from './AdminDashboardClient';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard - WordRush',
  description: 'Admin dashboard for managing users and monitoring system activity',
};

export default async function AdminDashboardPage() {
  // Check if user is admin
  const userIsAdmin = await isAdmin();
  
  if (!userIsAdmin) {
    redirect('/');
  }

  return <AdminDashboardClient />;
}
