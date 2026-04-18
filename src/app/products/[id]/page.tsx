'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, ExternalLink, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { api, type Product, type PriceEntry, type PriceHistory, type Review as ReviewType } from '@/lib/api';
import { formatPrice, formatDate, categoryLabels } from '@/lib/utils';

const SHOP_COLORS: Record<string, string> = {
  'Phong Vũ': '#6366f1',
  'GearVN': '#06b6d4',
  'An Phát': '#10b981',
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [currentPrices, setCurrentPrices] = useState<PriceEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    Promise.all([
      api.getProduct(productId),
      api.getCurrentPrices(productId),
      api.getPriceHistory(productId),
      api.getReviews(productId),
    ])
      .then(([prod, prices, history, revs]) => {
        setProduct(prod);
        setCurrentPrices(prices);
        setPriceHistory(history);
        setReviews(revs.data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '32px 24px' }}>
        <div className="skeleton" style={{ height: '400px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px' }}>😕</p>
        <p>Không tìm thấy sản phẩm</p>
        <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px', textDecoration: 'none' }}>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  // Prepare chart data
  const chartData: Record<string, any>[] = [];
  if (priceHistory?.history) {
    const allDates = new Set<string>();
    Object.values(priceHistory.history).forEach((entries) =>
      entries.forEach((e) => allDates.add(e.date))
    );
    const sortedDates = [...allDates].sort();
    for (const date of sortedDates) {
      const point: Record<string, any> = { date };
      Object.entries(priceHistory.history).forEach(([shop, entries]) => {
        const entry = entries.find((e) => e.date === date);
        if (entry) point[shop] = entry.price;
      });
      chartData.push(point);
    }
  }

  const specs = product.specs || {};

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      {/* =================== PRODUCT INFO =================== */}
      <div className="card animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '24px' }}>
        {/* Image */}
        <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', padding: '32px' }}>
          <img src={product.image_url || 'https://placehold.co/400x400/1a1a2e/6366f1?text=No+Image'} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-block' }}>
              {categoryLabels[product.category] || product.category}
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3 }}>{product.name}</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>Hãng: {product.brand}</p>
          </div>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={18} fill={s <= Math.round(product.avg_rating) ? '#f59e0b' : 'none'} stroke={s <= Math.round(product.avg_rating) ? '#f59e0b' : '#4a4a5a'} />
              ))}
            </div>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {product.avg_rating.toFixed(1)} ({product.review_count} đánh giá)
            </span>
          </div>

          {/* Price */}
          <div>
            <span style={{ fontSize: '32px', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatPrice(product.base_price)}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6, textAlign: 'justify' }}>
              {product.description}
            </p>
          )}

          {/* Current Prices from Shops */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Giá từ các shop:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentPrices.map((p) => (
                <div key={p.shop_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.shop_name}</span>
                    {!p.in_stock && <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '11px' }}>Hết hàng</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary-hover)' }}>{formatPrice(p.price)}</span>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', padding: '4px 10px' }}>
                        <ShoppingCart size={13} /> Mua
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =================== SPECS =================== */}
      <div className="card animate-fade-in" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📋 Thông số kỹ thuật</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0' }}>
          {Object.entries(specs).map(([key, value], i) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-secondary)',
            }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* =================== PRICE CHART =================== */}
      {chartData.length > 0 && (
        <div className="card animate-fade-in" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📈 Lịch sử giá</h2>
          <div style={{ width: '100%', height: '300px', minWidth: '0' }}>
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                  formatter={(value: any) => formatPrice(Number(value))}
                />
                <Legend />
                {priceHistory && Object.keys(priceHistory.history).map((shop) => (
                  <Line key={shop} type="monotone" dataKey={shop} stroke={SHOP_COLORS[shop] || '#888'} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =================== REVIEWS =================== */}
      <div className="card animate-fade-in">
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>💬 Đánh giá ({product.review_count})</h2>
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px' }}>Chưa có đánh giá nào</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => (
              <div key={review.id} style={{ padding: '16px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{review.user?.username || 'Ẩn danh'}</span>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill={s <= review.rating ? '#f59e0b' : 'none'} stroke={s <= review.rating ? '#f59e0b' : '#4a4a5a'} />
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(review.created_at)}</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .card[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
