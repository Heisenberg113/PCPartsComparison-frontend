'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: '📊' },
  { href: '/admin/products', label: 'Sản phẩm', icon: '🖥️' },
  { href: '/admin/reviews', label: 'Review', icon: '⭐' },
  { href: '/admin/users', label: 'Người dùng', icon: '👥' },
  { href: '/admin/crawler', label: 'Crawler', icon: '🕷️' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoggedIn, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isLoggedIn || user?.role !== 'admin') {
      router.replace('/');
    }
  }, [isHydrated, isLoggedIn, user, router]);

  if (!isHydrated || !isLoggedIn || user?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--color-text-muted)' }}>
        Đang kiểm tra quyền...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: '24px 0',
      }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
            Admin Panel
          </div>
        </div>
        <nav>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                  borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: '32px', background: 'var(--color-bg-primary)', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
