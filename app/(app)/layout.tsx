import { Suspense } from 'react';
import AppShell from '@/components/layout/AppShell';
import { PageLoader } from '@/components/shared/LoadingDots';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppShell>
  );
}
