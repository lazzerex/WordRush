import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import SwaggerUIClient from './SwaggerUIClient';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'API Docs - WordRush',
  description: 'OpenAPI documentation for the WordRush REST API',
};

export default async function ApiDocsPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/');
  }

  return <SwaggerUIClient />;
}
