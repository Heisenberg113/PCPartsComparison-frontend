'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, SortAsc, X } from 'lucide-react';
import { api, type Product, type ProductsResponse } from '@/lib/api';
import { categoryLabels } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = ['cpu', 'gpu', 'ram', 'ssd', 'mainboard', 'psu', 'case', 'cooler', 'monitor'];

export default function ProductsPageWrapper() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '32px 24px' }}><div className="skeleton" style={{ height: '600px' }} /></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<string[]>([]);

  // Filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Load brands when category changes
  useEffect(() => {
    api.getBrands(category || undefined).then((res) => {
      setBrands(res.map((b) => b.brand));
    }).catch(() => {});
  }, [category]);

  // Load products
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (search) params.set('search', search);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    params.set('page', String(page));
    params.set('limit', '20');

    api.getProducts(params.toString())
      .then((res) => {
        setProducts(res.data);
        setMeta(res.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, brand, search, minPrice, maxPrice, sortBy, sortOrder, page]);

  const clearFilters = () => {
    setCategory('');
    setBrand('');
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const hasActiveFilters = category || brand || search || minPrice || maxPrice;

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* =================== FILTER SIDEBAR =================== */}
        <aside style={{
          width: '260px',
          flexShrink: 0,
          display: showFilters ? 'block' : undefined,
        }} className="filter-sidebar">
          <div className="card" style={{ position: 'sticky', top: '88px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} /> Bộ lọc
              </h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
                  <X size={14} /> Xóa lọc
                </button>
              )}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Tìm kiếm</label>
              <input
                type="text"
                className="input"
                placeholder="Tên sản phẩm..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Loại linh kiện</label>
              <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setBrand(''); setPage(1); }}>
                <option value="">Tất cả</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{categoryLabels[c] || c}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Hãng</label>
              <select className="input" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }}>
                <option value="">Tất cả</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Khoảng giá (VND)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="input" placeholder="Từ" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
                <input type="number" className="input" placeholder="Đến" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Sắp xếp</label>
              <select className="input" value={`${sortBy}-${sortOrder}`} onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'ASC' | 'DESC');
                setPage(1);
              }}>
                <option value="created_at-DESC">Mới nhất</option>
                <option value="base_price-ASC">Giá tăng dần</option>
                <option value="base_price-DESC">Giá giảm dần</option>
                <option value="avg_rating-DESC">Đánh giá cao nhất</option>
                <option value="name-ASC">Tên A-Z</option>
              </select>
            </div>
          </div>
        </aside>

        {/* =================== PRODUCT LIST =================== */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm show-mobile-filter"
            style={{ marginBottom: '16px' }}
          >
            <Filter size={14} /> Bộ lọc
          </button>

          {/* Results header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {loading ? 'Đang tải...' : `Hiển thị ${products.length} / ${meta.total} sản phẩm`}
            </p>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="product-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '360px' }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</p>
              <p>Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.total_pages > 1 && (() => {
            // Smart pagination: show first, last, current ± siblings, with ellipsis
            const totalPages = meta.total_pages;
            const siblings = 1;
            const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];

            const leftSibling = Math.max(page - siblings, 1);
            const rightSibling = Math.min(page + siblings, totalPages);

            const showLeftEllipsis = leftSibling > 2;
            const showRightEllipsis = rightSibling < totalPages - 1;

            // Always show page 1
            pages.push(1);

            // Left ellipsis
            if (showLeftEllipsis) {
              pages.push('ellipsis-left');
            } else {
              // Fill pages between 1 and leftSibling
              for (let i = 2; i < leftSibling; i++) {
                pages.push(i);
              }
            }

            // Pages around current
            for (let i = leftSibling; i <= rightSibling; i++) {
              if (i !== 1 && i !== totalPages) {
                pages.push(i);
              }
            }

            // Right ellipsis
            if (showRightEllipsis) {
              pages.push('ellipsis-right');
            } else {
              for (let i = rightSibling + 1; i < totalPages; i++) {
                pages.push(i);
              }
            }

            // Always show last page
            if (totalPages > 1) {
              pages.push(totalPages);
            }

            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '32px', flexWrap: 'wrap' }}>
                {/* Previous button */}
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: page === 1 ? 0.4 : 1, minWidth: '36px' }}
                >
                  ‹
                </button>

                {pages.map((p, idx) => {
                  if (p === 'ellipsis-left' || p === 'ellipsis-right') {
                    return (
                      <span key={p} style={{ padding: '0 4px', color: 'var(--color-text-muted)', fontSize: '14px', userSelect: 'none' }}>
                        …
                      </span>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => setPage(p)}
                      className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ minWidth: '36px' }}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Next button */}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: page === totalPages ? 0.4 : 1, minWidth: '36px' }}
                >
                  ›
                </button>
              </div>
            );
          })()}

        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .filter-sidebar { display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0; z-index: 40; background: var(--color-bg-primary); padding: 16px; overflow-y: auto; }
          .filter-sidebar[style*="display: block"] { display: block !important; }
        }
        @media (min-width: 769px) {
          .show-mobile-filter { display: none !important; }
        }
      `}</style>
    </div>
  );
}
