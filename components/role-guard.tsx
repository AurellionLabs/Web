'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface RoleGuardProps {
  allowedRoles: ('customer' | 'node' | 'driver')[];
  children: ReactNode;
  fallbackPath?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallbackPath = '/',
}: RoleGuardProps) {
  const { currentUserRole } = useMainProvider();
  const router = useRouter();

  useEffect(() => {
    if (!allowedRoles.includes(currentUserRole)) {
      router.push(fallbackPath);
    }
  }, [currentUserRole, router, allowedRoles, fallbackPath]);

  if (!allowedRoles.includes(currentUserRole)) return null;

  return <>{children}</>;
}
