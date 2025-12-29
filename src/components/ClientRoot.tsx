"use client";
import GlobalClickSparkProvider from '@/components/GlobalClickSparkProvider';
import { SupabaseProvider } from '@/components/SupabaseProvider';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <GlobalClickSparkProvider>
        {children}
      </GlobalClickSparkProvider>
    </SupabaseProvider>
  );
}
