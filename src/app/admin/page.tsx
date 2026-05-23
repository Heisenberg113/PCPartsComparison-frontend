'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/providers';
import { api, type AdminStats } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  cpu: 'CPU', gpu: 'GPU', ram: 'RAM', harddrive: 'Ổ cứng',
  mainboard: 'Mainboard', psu: 'Nguồn', case: 'Case', cooler: 'Tản nhiệt', monitor: 'Màn hình',
};

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value.toLocaleString()}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.adminGetStats(token);
        if (!cancelled) setStats(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Đang tải...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)' }}>Lỗi: {error}</div>;
  if (!stats) return null;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Tổng quan hệ thống</h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Sản phẩm" value={stats.totals.products} icon="🖥️" color="var(--color-primary)" />
        <StatCard label="Người dùng" value={stats.totals.users} icon="👥" color="var(--color-accent)" />
        <StatCard label="Review" value={stats.totals.reviews} icon="⭐" color="var(--color-warning)" />
        <StatCard label="Bản ghi giá" value={stats.totals.prices} icon="💰" color="var(--color-success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Category breakdown */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Sản phẩm theo danh mục</h2>
          {stats.categoryStats.map(({ category, count }) => {
            const pct = stats.totals.products > 0 ? Math.round((Number(count) / stats.totals.products) * 100) : 0;
            return (
              <div key={category} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{CATEGORY_LABEL[category] ?? category}</span>
                  <span style={{ fontWeight: 600 }}>{Number(count).toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent products */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Sản phẩm mới nhất</h2>
            <Link href="/admin/products" style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}>Xem tất cả →</Link>
          </div>
          {stats.recentProducts.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{CATEGORY_LABEL[p.category] ?? p.category} · {p.brand}</div>
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                {new Date(p.created_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
          ))}
        </div>

        {/* Recent reviews */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24, gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Review mới nhất</h2>
            <Link href="/admin/reviews" style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}>Xem tất cả →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', fontWeight: 500 }}>Sản phẩm</th>
                <th style={{ padding: '6px 8px', fontWeight: 500 }}>Người dùng</th>
                <th style={{ padding: '6px 8px', fontWeight: 500 }}>Điểm</th>
                <th style={{ padding: '6px 8px', fontWeight: 500 }}>Nội dung</th>
                <th style={{ padding: '6px 8px', fontWeight: 500 }}>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentReviews.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{r.product?.name ?? '—'}</td>
                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{r.user?.username ?? '—'}</td>
                  <td style={{ padding: '8px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                  <td style={{ padding: '8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</td>
                  <td style={{ padding: '8px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
