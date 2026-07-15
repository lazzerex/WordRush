'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerUIClient() {
  return (
    <main className="pt-24 pb-12 bg-white min-h-screen">
      <SwaggerUI url="/api/admin/openapi" />
    </main>
  );
}
