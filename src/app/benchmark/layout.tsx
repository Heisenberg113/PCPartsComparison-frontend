'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Cpu, Monitor } from 'lucide-react';

export default function BenchmarkLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/benchmark/cpu', label: 'CPU', icon: <Cpu size={16} /> },
    { href: '/benchmark/gpu', label: 'GPU', icon: <Monitor size={16} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Trophy size={28} style={{ color: 'var(--color-primary)' }} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Bảng xếp hạng Benchmark</h1>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Điểm PassMark — nguồn: videocardbenchmark.net &amp; cpubenchmark.net
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '28px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0',
        }}>
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  marginBottom: '-1px',
                }}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
