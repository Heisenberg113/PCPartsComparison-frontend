'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { api, type Product } from '@/lib/api';
import { formatPrice, categoryLabels } from '@/lib/utils';
import { useCompare } from '@/lib/providers';

export default function ComparePage() {
  const { compareIds, removeFromCompare, clearCompare } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length < 2) {
      setProducts([]);
      return;
    }
    setLoading(true);
    api.compareProducts(compareIds)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [compareIds]);

  // Get all unique spec keys
  const allSpecKeys = [...new Set(products.flatMap((p) => Object.keys(p.specs || {})))];

  if (compareIds.length < 2) {
    return (
      <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>⚖️ So sánh sản phẩm</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Chọn 2–4 sản phẩm để so sánh. Click nút <span style={{ display: 'inline-flex', padding: '2px 6px', background: 'var(--color-bg-card)', borderRadius: '4px', fontSize: '12px' }}>⇆</span> trên thẻ sản phẩm.
        </p>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Đã chọn: {compareIds.length}/4 sản phẩm
        </p>
        <Link href="/products" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} /> Chọn sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>⚖️ So sánh sản phẩm</h1>
        <button onClick={clearCompare} className="btn btn-danger btn-sm">
          <Trash2 size={14} /> Xóa tất cả
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '500px' }} />
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px', width: '160px' }}>
                  Thông tin
                </th>
                {products.map((p) => (
                  <th key={p.id} style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={p.image_url || 'https://placehold.co/80x80/1a1a2e/6366f1'} alt={p.name} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', background: 'var(--color-bg-secondary)', padding: '8px' }} />
                      <Link href={`/products/${p.id}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-hover)', textDecoration: 'none' }}>{p.name}</Link>
                      <button onClick={() => removeFromCompare(p.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--color-danger)' }}>
                        <Trash2 size={12} /> Bỏ
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Brand */}
              <tr>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px' }}>Hãng</td>
                {products.map((p) => (
                  <td key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', fontSize: '14px' }}>{p.brand}</td>
                ))}
              </tr>
              {/* Category */}
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loại</td>
                {products.map((p) => (
                  <td key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', fontSize: '14px' }}>{categoryLabels[p.category] || p.category}</td>
                ))}
              </tr>
              {/* Price */}
              <tr>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px' }}>Giá</td>
                {products.map((p) => {
                  const isLowest = p.base_price === Math.min(...products.map((pr) => pr.base_price));
                  return (
                    <td key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', fontWeight: 700, color: isLowest ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                      {formatPrice(p.base_price)}
                      {isLowest && <span className="badge badge-success" style={{ marginLeft: '6px', fontSize: '10px' }}>Rẻ nhất</span>}
                    </td>
                  );
                })}
              </tr>
              {/* Rating */}
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px' }}>Đánh giá</td>
                {products.map((p) => (
                  <td key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', fontSize: '14px' }}>
                    ⭐ {p.avg_rating.toFixed(1)} ({p.review_count})
                  </td>
                ))}
              </tr>
              {/* Dynamic specs */}
              {allSpecKeys.map((key, i) => (
                <tr key={key} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-secondary)' }}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', fontSize: '14px' }}>
                      {p.specs?.[key] !== undefined ? String(p.specs[key]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
