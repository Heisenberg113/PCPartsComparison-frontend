'use client';

import Link from 'next/link';
import { Star, GitCompareArrows } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useCompare } from '@/lib/providers';
import type { Product } from '@/lib/api';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const inCompare = isInCompare(product.id);

  return (
    <Link
      href={`/products/${product.id}`}
      className="card card-interactive animate-fade-in"
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}
    >
      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }}
            loading="lazy"
          />
        ) : (
          <div style={{ fontSize: '48px', opacity: 0.3 }}>📦</div>
        )}
      </div>

      {/* Category Badge */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
          {product.category}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{product.brand}</span>
      </div>

      {/* Name */}
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '40px',
      }}>
        {product.name}
      </h3>

      {/* Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={13} fill={s <= Math.round(product.avg_rating) ? '#f59e0b' : 'none'} stroke={s <= Math.round(product.avg_rating) ? '#f59e0b' : '#4a4a5a'} />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          ({product.review_count})
        </span>
      </div>

      {/* Price & Compare */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{
          fontSize: '18px',
          fontWeight: 700,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {formatPrice(product.base_price)}
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            inCompare ? removeFromCompare(product.id) : addToCompare(product.id);
          }}
          className={`btn btn-sm ${inCompare ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', fontSize: '12px' }}
          title={inCompare ? 'Bỏ so sánh' : 'Thêm so sánh'}
        >
          <GitCompareArrows size={14} />
        </button>
      </div>
    </Link>
  );
}
