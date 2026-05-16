'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { api, type Product } from '@/lib/api';
import { categoryLabels } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = ['cpu', 'gpu', 'ram', 'harddrive', 'mainboard', 'psu', 'case', 'cooler', 'monitor'];

// ─── Spec filter types ───────────────────────────────────────────────────────
type SelectSpec = { type: 'select'; key: string; label: string; options: string[] };
type RangeSpec  = { type: 'range';  key: string; label: string; unit: string; min: number; max: number; step?: number };
type SpecDef = SelectSpec | RangeSpec;

type RangeValue = { min?: number; max?: number };
type SpecFilters = Record<string, string | RangeValue>;

// ─── Per-category spec filter configs ────────────────────────────────────────
const SPEC_CONFIGS: Record<string, SpecDef[]> = {
  cpu: [
    { type: 'select', key: 'Socket',                   label: 'Socket',               options: ['LGA1700', 'LGA1851', 'AM4', 'AM5', 'sTR5'] },
    { type: 'range',  key: 'Core Count',               label: 'Số nhân',              unit: '',    min: 2,  max: 64,   step: 2 },
    { type: 'range',  key: 'TDP',                      label: 'TDP (W)',              unit: 'W',   min: 10, max: 350 },
    { type: 'range',  key: 'Performance Core Clock',   label: 'Xung cơ bản (GHz)',   unit: 'GHz', min: 1,  max: 6,    step: 0.1 },
    { type: 'range',  key: 'L3 Cache',                 label: 'Cache L3 (MB)',        unit: 'MB',  min: 4,  max: 256 },
  ],
  gpu: [
    { type: 'select', key: 'Memory Type', label: 'Loại VRAM',         options: ['GDDR5', 'GDDR6', 'GDDR6X', 'GDDR7'] },
    { type: 'range',  key: 'Memory',      label: 'VRAM (GB)',         unit: 'GB',  min: 4,   max: 48 },
    { type: 'range',  key: 'Core Clock',  label: 'Core Clock (MHz)',  unit: 'MHz', min: 500, max: 3500, step: 50 },
    { type: 'range',  key: 'TDP',         label: 'TDP (W)',           unit: 'W',   min: 50,  max: 600 },
  ],
  ram: [
    { type: 'select', key: 'Form Factor',  label: 'Form Factor', options: ['288-pin DIMM (DDR4)', '288-pin DIMM (DDR5)', 'SO-DIMM'] },
    { type: 'select', key: 'Speed',        label: 'Tốc độ',      options: ['DDR4-3200', 'DDR4-3600', 'DDR5-4800', 'DDR5-5200', 'DDR5-6000', 'DDR5-6400'] },
    { type: 'range',  key: 'CAS Latency',  label: 'CAS Latency', unit: '', min: 10, max: 50 },
  ],
  mainboard: [
    { type: 'select', key: 'Socket / CPU', label: 'Socket CPU',   options: ['LGA1700', 'LGA1851', 'AM4', 'AM5'] },
    { type: 'select', key: 'Form Factor',  label: 'Form Factor',  options: ['ATX', 'Micro ATX', 'Mini ITX', 'E-ATX'] },
    { type: 'select', key: 'Memory Type',  label: 'Loại RAM',     options: ['DDR4', 'DDR5'] },
    { type: 'select', key: 'Chipset',      label: 'Chipset',      options: ['B660', 'B760', 'Z690', 'Z790', 'Z890', 'B650', 'B850', 'X670', 'X870', 'A620'] },
  ],
  psu: [
    { type: 'range',  key: 'Wattage',           label: 'Công suất (W)',       unit: 'W', min: 300, max: 1800, step: 50 },
    { type: 'select', key: 'Efficiency Rating',  label: 'Chuẩn hiệu suất',   options: ['80+', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'] },
    { type: 'select', key: 'Modular',            label: 'Modular',            options: ['Full', 'Semi', 'Non'] },
  ],
  harddrive: [
    { type: 'select', key: 'Interface',    label: 'Giao tiếp',   options: ['SATA 6.0 Gb/s', 'M.2 PCIe 3.0 X4', 'M.2 PCIe 4.0 X4', 'M.2 PCIe 5.0 X4'] },
    { type: 'select', key: 'Form Factor',  label: 'Form Factor', options: ['2.5"', '3.5"', 'M.2-2242', 'M.2-2260', 'M.2-2280'] },
  ],
  case: [
    { type: 'select', key: 'Type',         label: 'Loại Case',   options: ['ATX Mid Tower', 'ATX Full Tower', 'Micro ATX Mini Tower', 'Mini ITX Desktop'] },
    { type: 'select', key: 'Side Panel',   label: 'Side Panel',  options: ['Tempered Glass', 'Plastic Window', 'None'] },
  ],
  cooler: [
    { type: 'select', key: 'Type',        label: 'Loại',                  options: ['Air', 'Liquid'] },
    { type: 'range',  key: 'Fan RPM',     label: 'Tốc độ quạt (RPM)',    unit: 'RPM', min: 500, max: 3500, step: 100 },
    { type: 'range',  key: 'Noise Level', label: 'Độ ồn (dB)',           unit: 'dB',  min: 10,  max: 60 },
  ],
  monitor: [
    { type: 'select', key: 'Panel Type',   label: 'Tấm nền',               options: ['IPS', 'TN', 'VA', 'OLED', 'QD-OLED'] },
    { type: 'select', key: 'Resolution',   label: 'Độ phân giải',          options: ['1920x1080', '2560x1440', '3840x2160', '2560x1080', '3440x1440'] },
    { type: 'range',  key: 'Screen Size',  label: 'Kích thước (inch)',     unit: '"',  min: 20, max: 49 },
    { type: 'range',  key: 'Refresh Rate', label: 'Tần số quét (Hz)',      unit: 'Hz', min: 60, max: 360, step: 5 },
  ],
};

// ─── Dual range slider component ─────────────────────────────────────────────
function DualRangeSlider({ spec, value, onChange }: {
  spec: RangeSpec;
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}) {
  const step = spec.step ?? 1;
  const lv = value.min ?? spec.min;
  const hv = value.max ?? spec.max;
  const lowPct  = ((lv - spec.min) / (spec.max - spec.min)) * 100;
  const highPct = ((hv - spec.min) / (spec.max - spec.min)) * 100;
  const isActive = value.min !== undefined || value.max !== undefined;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{spec.label}</label>
        <span style={{ fontSize: '12px', fontWeight: 500, color: isActive ? 'var(--color-accent, #6366f1)' : 'var(--color-text-muted)' }}>
          {isActive
            ? `${lv}${spec.unit} – ${hv}${spec.unit}`
            : 'Tất cả'}
        </span>
      </div>

      {/* Track + inputs */}
      <div style={{ position: 'relative', height: '22px' }}>
        {/* Background track */}
        <div style={{
          position: 'absolute', top: '9px', left: 0, right: 0, height: '4px',
          borderRadius: '2px', background: 'var(--color-bg-tertiary, #2a2a3a)',
          pointerEvents: 'none',
        }} />
        {/* Active fill — chỉ hiện khi người dùng đã kéo */}
        {isActive && (
          <div style={{
            position: 'absolute', top: '9px', left: `${lowPct}%`, right: `${100 - highPct}%`, height: '4px',
            borderRadius: '2px', background: '#6366f1', pointerEvents: 'none',
          }} />
        )}
        {/* Low handle */}
        <input
          type="range"
          min={spec.min} max={spec.max} step={step} value={lv}
          className="spec-range"
          style={{ zIndex: lv >= spec.max - (spec.max - spec.min) * 0.1 ? 5 : 3 }}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hv - step);
            onChange({ min: v === spec.min ? undefined : v, max: value.max });
          }}
        />
        {/* High handle */}
        <input
          type="range"
          min={spec.min} max={spec.max} step={step} value={hv}
          className="spec-range"
          style={{ zIndex: 4 }}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lv + step);
            onChange({ min: value.min, max: v === spec.max ? undefined : v });
          }}
        />
      </div>

      {/* Min/max labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
        <span>{spec.min}{spec.unit}</span>
        <span>{spec.max}{spec.unit}</span>
      </div>
    </div>
  );
}

// ─── Page wrapper (needed for Suspense + useSearchParams) ────────────────────
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

  // Basic filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Spec filters (reset when category changes)
  const [specFilters, setSpecFilters] = useState<SpecFilters>({});

  // Debounced values — search and specFilters are debounced 400ms so slider drags don't spam API
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedSpecFilters, setDebouncedSpecFilters] = useState<SpecFilters>(specFilters);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  useEffect(() => {
    if (specTimerRef.current) clearTimeout(specTimerRef.current);
    specTimerRef.current = setTimeout(() => setDebouncedSpecFilters(specFilters), 400);
    return () => { if (specTimerRef.current) clearTimeout(specTimerRef.current); };
  }, [specFilters]);

  // Load brands when category changes
  useEffect(() => {
    api.getBrands(category || undefined).then((res) => {
      setBrands(res.map((b) => b.brand));
    }).catch(() => {});
  }, [category]);

  // Load products — uses debounced search/specFilters so slider drags don't clear the grid
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (!hasLoadedRef.current) setLoading(true);
    setRefreshing(true);

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (Object.keys(debouncedSpecFilters).length > 0) params.set('specs_filter', JSON.stringify(debouncedSpecFilters));
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    params.set('page', String(page));
    params.set('limit', '20');

    api.getProducts(params.toString(), signal)
      .then((res) => {
        hasLoadedRef.current = true;
        setProducts(res.data);
        setMeta(res.meta);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setLoading(false);
          setRefreshing(false);
        }
      });
  }, [category, brand, debouncedSearch, minPrice, maxPrice, debouncedSpecFilters, sortBy, sortOrder, page]);

  const clearFilters = () => {
    setCategory(''); setBrand(''); setSearch(''); setDebouncedSearch('');
    setMinPrice(''); setMaxPrice(''); setSpecFilters({}); setDebouncedSpecFilters({}); setPage(1);
  };

  const hasActiveFilters = !!(category || brand || search || minPrice || maxPrice || Object.keys(specFilters).length > 0);

  const activeSpecCount = Object.keys(specFilters).length;

  const specConfigs = category ? (SPEC_CONFIGS[category] ?? []) : [];

  // Helpers to update spec filter state
  const setSpecSelect = (key: string, val: string) => {
    setSpecFilters((prev) => {
      if (!val) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: val };
    });
    setPage(1);
  };

  const setSpecRange = (key: string, val: RangeValue) => {
    setSpecFilters((prev) => {
      if (val.min === undefined && val.max === undefined) {
        const n = { ...prev }; delete n[key]; return n;
      }
      return { ...prev, [key]: val };
    });
    setPage(1);
  };

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', gap: '24px' }}>

        {/* =================== FILTER SIDEBAR =================== */}
        <aside
          className="filter-sidebar"
          style={{
            width: '260px',
            flexShrink: 0,
            position: 'sticky',
            top: '88px',
            height: 'calc(100vh - 88px - 32px)',
            overflowY: 'auto',
            display: showFilters ? 'block' : undefined,
          }}
        >
          <div className="card" style={{ minHeight: '100%' }}>
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
              <input type="text" className="input" placeholder="Tên sản phẩm..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Loại linh kiện</label>
              <select className="input" value={category} onChange={(e) => {
                setCategory(e.target.value); setBrand(''); setSpecFilters({}); setDebouncedSpecFilters({}); setPage(1);
              }}>
                <option value="">Tất cả</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c] || c}</option>)}
              </select>
            </div>

            {/* Brand */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Hãng</label>
              <select className="input" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }}>
                <option value="">Tất cả</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Price Range */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Khoảng giá (VND)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="input" placeholder="Từ" value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
                <input type="number" className="input" placeholder="Đến" value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
              </div>
            </div>

            {/* Sort */}
            <div style={{ marginBottom: specConfigs.length > 0 ? '0' : undefined }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Sắp xếp</label>
              <select className="input" value={`${sortBy}-${sortOrder}`} onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb); setSortOrder(so as 'ASC' | 'DESC'); setPage(1);
              }}>
                <option value="created_at-DESC">Mới nhất</option>
                <option value="base_price-ASC">Giá tăng dần</option>
                <option value="base_price-DESC">Giá giảm dần</option>
                <option value="avg_rating-DESC">Đánh giá cao nhất</option>
                <option value="name-ASC">Tên A-Z</option>
              </select>
            </div>

            {/* ── Spec filters (only when category has configs) ── */}
            {specConfigs.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--color-border)', margin: '20px 0 16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Thông số kỹ thuật
                    {activeSpecCount > 0 && (
                      <span style={{
                        marginLeft: '6px', fontSize: '11px', padding: '1px 6px',
                        background: '#6366f1', color: '#fff', borderRadius: '10px',
                      }}>{activeSpecCount}</span>
                    )}
                  </span>
                  {activeSpecCount > 0 && (
                    <button onClick={() => { setSpecFilters({}); setPage(1); }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '11px', color: 'var(--color-danger)', padding: '2px 6px' }}>
                      Xóa
                    </button>
                  )}
                </div>

                {specConfigs.map((spec) => {
                  if (spec.type === 'select') {
                    const val = (specFilters[spec.key] as string) ?? '';
                    return (
                      <div key={spec.key} style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                          {spec.label}
                        </label>
                        <select className="input" value={val} onChange={(e) => setSpecSelect(spec.key, e.target.value)}>
                          <option value="">Tất cả</option>
                          {spec.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    );
                  }
                  // range
                  const rangeVal = (specFilters[spec.key] as RangeValue) ?? {};
                  return (
                    <DualRangeSlider
                      key={spec.key}
                      spec={spec}
                      value={rangeVal}
                      onChange={(v) => setSpecRange(spec.key, v)}
                    />
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {/* =================== PRODUCT LIST =================== */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile filter toggle */}
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary btn-sm show-mobile-filter" style={{ marginBottom: '16px' }}>
            <Filter size={14} /> Bộ lọc
          </button>

          {/* Results header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {loading ? 'Đang tải...' : refreshing ? 'Đang lọc...' : `Hiển thị ${products.length} / ${meta.total} sản phẩm`}
            </p>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="product-grid">{[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '360px' }} />)}</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</p>
              <p>Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div className="product-grid" style={refreshing ? { opacity: 0.6, transition: 'opacity 0.15s', pointerEvents: 'none' } : undefined}>
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {meta.total_pages > 1 && (() => {
            const totalPages = meta.total_pages;
            const siblings = 1;
            const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
            const leftSibling = Math.max(page - siblings, 1);
            const rightSibling = Math.min(page + siblings, totalPages);
            const showLeftEllipsis = leftSibling > 2;
            const showRightEllipsis = rightSibling < totalPages - 1;

            pages.push(1);
            if (showLeftEllipsis) {
              pages.push('ellipsis-left');
            } else {
              for (let i = 2; i < leftSibling; i++) pages.push(i);
            }
            for (let i = leftSibling; i <= rightSibling; i++) {
              if (i !== 1 && i !== totalPages) pages.push(i);
            }
            if (showRightEllipsis) {
              pages.push('ellipsis-right');
            } else {
              for (let i = rightSibling + 1; i < totalPages; i++) pages.push(i);
            }
            if (totalPages > 1) pages.push(totalPages);

            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '32px', flexWrap: 'wrap' }}>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="btn btn-secondary btn-sm" style={{ opacity: page === 1 ? 0.4 : 1, minWidth: '36px' }}>‹</button>
                {pages.map((p, idx) => {
                  if (p === 'ellipsis-left' || p === 'ellipsis-right') {
                    return <span key={p} style={{ padding: '0 4px', color: 'var(--color-text-muted)', fontSize: '14px', userSelect: 'none' }}>…</span>;
                  }
                  return (
                    <button key={idx} onClick={() => setPage(p)}
                      className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ minWidth: '36px' }}>{p}</button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="btn btn-secondary btn-sm" style={{ opacity: page === totalPages ? 0.4 : 1, minWidth: '36px' }}>›</button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* styled-jsx global: áp dụng cho DualRangeSlider (component riêng, ngoài scope jsx thường) */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .filter-sidebar { display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0; z-index: 40; background: var(--color-bg-primary); padding: 16px; overflow-y: auto; height: auto !important; }
          .filter-sidebar[style*="display: block"] { display: block !important; }
        }
        @media (min-width: 769px) {
          .show-mobile-filter { display: none !important; }
          .filter-sidebar { scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
          .filter-sidebar::-webkit-scrollbar { width: 4px; }
          .filter-sidebar::-webkit-scrollbar-track { background: transparent; }
          .filter-sidebar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
        }
        /* ── Dual range slider ─────────────────────────────── */
        input.spec-range {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 22px;
          margin: 0;
          padding: 0;
          background: transparent;
          -webkit-appearance: none;
          appearance: none;
          pointer-events: none;
          outline: none;
        }
        /* Ẩn native track trên Webkit */
        input.spec-range::-webkit-slider-runnable-track {
          background: transparent;
          height: 4px;
          border: none;
        }
        /* Ẩn native track trên Firefox */
        input.spec-range::-moz-range-track {
          background: transparent;
          height: 4px;
          border: none;
        }
        input.spec-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid var(--color-bg-primary, #0f0f17);
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          transition: transform 0.1s;
          margin-top: -6px;
        }
        input.spec-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input.spec-range::-moz-range-thumb {
          pointer-events: all;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid var(--color-bg-primary, #0f0f17);
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        input.spec-range::-moz-range-progress {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
