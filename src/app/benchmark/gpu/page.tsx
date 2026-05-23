'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Product } from '@/lib/api';
import { ExternalLink } from 'lucide-react';

export default function GpuBenchmarkPage() {
  const [products, setProducts] = useState<(Product & { min_price: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const LIMIT = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      category: 'gpu',
      has_benchmark: 'true',
      sort_by: 'benchmark_score',
      sort_order: 'DESC',
      page: String(page),
      limit: String(LIMIT),
    });
    api.getProducts(params.toString())
      .then((res) => {
        setProducts(res.data as (Product & { min_price: number | null })[]);
        setTotalPages(res.meta.total_pages);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const maxScore = products[0]?.benchmark_score ?? 1;
  const offset = (page - 1) * LIMIT;

  return (
    <div>
      <div style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
        {total > 0 && <span>{total} GPU có điểm benchmark</span>}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
          Đang tải...
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
          Chưa có dữ liệu benchmark. Chạy <code>npm run benchmark:crawl</code> để lấy điểm.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['#', 'Tên GPU', 'Hãng', 'Điểm PassMark', 'Hiệu năng tương đối', 'Giá thấp nhất'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px',
                    textAlign: h === '#' || h === 'Điểm PassMark' ? 'center' : 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const rank = offset + i + 1;
                const pct = maxScore > 0 ? ((p.benchmark_score ?? 0) / maxScore) * 100 : 0;
                const isTop3 = rank <= 3;
                return (
                  <tr key={p.id} style={{
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Rank */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', width: '48px' }}>
                      {isTop3 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          fontSize: '13px',
                          fontWeight: 700,
                          background: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
                          color: '#000',
                        }}>{rank}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500 }}>{rank}</span>
                      )}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/products/${p.id}`} style={{
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        {p.name}
                        <ExternalLink size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      </Link>
                    </td>

                    {/* Brand */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg-secondary)',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}>{p.brand}</span>
                    </td>

                    {/* Score */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: isTop3 ? 'var(--color-primary)' : 'var(--color-text)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {(p.benchmark_score ?? 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Bar */}
                    <td style={{ padding: '12px 14px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          background: 'var(--color-bg-secondary)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: pct > 80
                              ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                              : pct > 50
                              ? 'linear-gradient(90deg, #3b82f6, #10b981)'
                              : 'linear-gradient(90deg, #64748b, #3b82f6)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '38px', textAlign: 'right' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {p.min_price ? (
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-success)' }}>
                          {p.min_price.toLocaleString('vi-VN')}₫
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-ghost btn-sm"
            style={{ opacity: page === 1 ? 0.4 : 1 }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} style={{ padding: '6px 4px', color: 'var(--color-text-muted)' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-ghost btn-sm"
            style={{ opacity: page === totalPages ? 0.4 : 1 }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
