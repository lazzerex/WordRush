"use client";
import GlobalClickSparkProvider from '@/components/GlobalClickSparkProvider';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <GlobalClickSparkProvider>
      {children}
    </GlobalClickSparkProvider>
  );
}
