'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, ArrowRight, Cpu, Monitor, HardDrive, MemoryStick, Zap, Wind } from 'lucide-react';
import { api, type Product } from '@/lib/api';
import { formatPrice, categoryLabels, categoryIcons } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';

const HERO_CATEGORIES = [
  { key: 'cpu', label: 'CPU', icon: <Cpu size={28} />, color: '#6366f1' },
  { key: 'gpu', label: 'VGA', icon: <Monitor size={28} />, color: '#06b6d4' },
  { key: 'ram', label: 'RAM', icon: <MemoryStick size={28} />, color: '#8b5cf6' },
  { key: 'harddrive', label: 'HARDDRIVE', icon: <HardDrive size={28} />, color: '#10b981' },
  { key: 'mainboard', label: 'Mainboard', icon: <Zap size={28} />, color: '#f59e0b' },
  { key: 'cooler', label: 'Tản nhiệt', icon: <Wind size={28} />, color: '#0ea5e9' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: string }[]>([]);

  useEffect(() => {
    api.getProducts('limit=8&sort_by=avg_rating&sort_order=DESC')
      .then((res) => setFeaturedProducts(res.data))
      .catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div>
      {/* =================== HERO =================== */}
      <section style={{
        background: 'var(--gradient-hero)',
        padding: '80px 0 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '16px',
          }}>
            So sánh linh kiện PC{' '}
            <span style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              thông minh
            </span>
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            maxWidth: '540px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            Tra cứu thông số, so sánh giá từ nhiều shop và tìm linh kiện PC phù hợp với ngân sách của bạn.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{
            maxWidth: '560px',
            margin: '0 auto',
            position: 'relative',
          }}>
            <input
              type="text"
              placeholder="Tìm kiếm CPU, GPU, RAM, HARDDRIVE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{
                padding: '16px 140px 16px 48px',
                fontSize: '16px',
                borderRadius: '999px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
              }}
            />
            <Search size={20} style={{
              position: 'absolute',
              left: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }} />
            <button type="submit" className="btn btn-primary" style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: '999px',
              padding: '10px 24px',
            }}>
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {/* =================== CATEGORIES =================== */}
      <section style={{ padding: '48px 0' }}>
        <div className="container">
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
            Danh mục linh kiện
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {HERO_CATEGORIES.map((cat) => {
              const count = categories.find((c) => c.category === cat.key)?.count || '0';
              return (
                <Link
                  key={cat.key}
                  href={`/products?category=${cat.key}`}
                  className="card card-interactive"
                  style={{
                    textDecoration: 'none',
                    padding: '20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: `${cat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cat.color,
                  }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.label}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{count} sản phẩm</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================== FEATURED PRODUCTS =================== */}
      <section style={{ padding: '0 0 64px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Sản phẩm nổi bật</h2>
            <Link href="/products" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '360px' }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =================== BUILD CTA =================== */}
      <section style={{
        padding: '64px 0',
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
            🛠️ Xây dựng cấu hình PC
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
            Nhập ngân sách, chọn mục đích sử dụng — hệ thống sẽ gợi ý cấu hình tối ưu cho bạn.
          </p>
          <Link href="/build" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            Bắt đầu Build PC <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
