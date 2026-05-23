'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/providers';
import { api, type Product } from '@/lib/api';

const CATEGORIES = ['cpu', 'gpu', 'ram', 'harddrive', 'mainboard', 'psu', 'case', 'cooler', 'monitor'];
const CATEGORY_LABEL: Record<string, string> = {
  cpu: 'CPU', gpu: 'GPU', ram: 'RAM', harddrive: 'Ổ cứng',
  mainboard: 'Mainboard', psu: 'Nguồn', case: 'Case', cooler: 'Tản nhiệt', monitor: 'Màn hình',
};

type SortKey = 'id' | 'name' | 'base_price' | 'created_at';

const EMPTY_FORM = {
  name: '', category: 'cpu', brand: '', image_url: '', description: '',
  base_price: '', specs: '{}',
};

type FormState = typeof EMPTY_FORM;

export default function AdminProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort_by: sortBy, sort_order: sortOrder });
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      const res = await api.getProducts(params.toString());
      setProducts(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch {
      // lỗi đã được xử lý ở UI (loading state)
    } finally {
      setLoading(false);
    }
  }, [token, page, search, filterCategory, sortBy, sortOrder]);

  function handleSort(key: SortKey) {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      setSortOrder('DESC');
    }
    setPage(1);
  }

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function openCreate() {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand,
      image_url: p.image_url ?? '',
      description: p.description ?? '',
      base_price: p.base_price != null ? String(p.base_price) : '',
      specs: JSON.stringify(p.specs ?? {}, null, 2),
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!token) return;
    setFormError('');
    let specs: Record<string, unknown> = {};
    try { specs = JSON.parse(form.specs); } catch { setFormError('Specs JSON không hợp lệ'); return; }

    const data = {
      name: form.name,
      category: form.category,
      brand: form.brand,
      image_url: form.image_url || undefined,
      description: form.description || undefined,
      base_price: form.base_price ? Number(form.base_price) : undefined,
      specs,
    };

    setSaving(true);
    try {
      if (editProduct) {
        await api.adminUpdateProduct(token, editProduct.id, data);
      } else {
        await api.adminCreateProduct(token, data);
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.adminDeleteProduct(token, id);
      setDeleteId(null);
      fetchProducts();
    } catch (e: any) {
      alert('Lỗi xóa sản phẩm: ' + e.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Quản lý sản phẩm</h1>
        <button onClick={openCreate} style={btnStyle('primary')}>+ Thêm sản phẩm</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Tìm kiếm tên..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={inputStyle}
        />
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        {total.toLocaleString()} sản phẩm
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'var(--color-bg-secondary)' }}>
            <tr style={{ color: 'var(--color-text-muted)' }}>
              <SortTh label="ID" sortKey="id" current={sortBy} order={sortOrder} onSort={handleSort} />
              <SortTh label="Tên sản phẩm" sortKey="name" current={sortBy} order={sortOrder} onSort={handleSort} />
              <th style={thStyle}>Danh mục</th>
              <th style={thStyle}>Thương hiệu</th>
              <SortTh label="Giá" sortKey="base_price" current={sortBy} order={sortOrder} onSort={handleSort} />
              <SortTh label="Ngày tạo" sortKey="created_at" current={sortBy} order={sortOrder} onSort={handleSort} />
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Đang tải...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Không có sản phẩm</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={tdStyle}>{p.id}</td>
                <td style={{ ...tdStyle, maxWidth: 280 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                </td>
                <td style={tdStyle}>{CATEGORY_LABEL[p.category] ?? p.category}</td>
                <td style={tdStyle}>{p.brand}</td>
                <td style={tdStyle}>{p.base_price ? Number(p.base_price).toLocaleString('vi-VN') + '₫' : '—'}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(p)} style={btnStyle('secondary', 'sm')}>Sửa</button>
                    <button onClick={() => setDeleteId(p.id)} style={btnStyle('danger', 'sm')}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setShowModal(false)}>
          <FormField label="Tên sản phẩm *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </FormField>
          <FormField label="Danh mục *">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </FormField>
          <FormField label="Thương hiệu *">
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={inputStyle} />
          </FormField>
          <FormField label="URL hình ảnh">
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} style={inputStyle} />
          </FormField>
          <FormField label="Giá gốc (₫)">
            <input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} style={inputStyle} />
          </FormField>
          <FormField label="Mô tả">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <FormField label="Specs (JSON)">
            <textarea value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} rows={5} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
          </FormField>
          {formError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{formError}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnStyle('secondary')}>Hủy</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('primary')}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId != null && (
        <Modal title="Xác nhận xóa" onClose={() => setDeleteId(null)}>
          <p style={{ marginBottom: 20, color: 'var(--color-text-secondary)' }}>
            Bạn có chắc muốn xóa sản phẩm này? Thao tác không thể hoàn tác.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteId(null)} style={btnStyle('secondary')}>Hủy</button>
            <button onClick={() => handleDelete(deleteId)} style={btnStyle('danger')}>Xóa</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const groupStart = Math.floor((page - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
  const groupEnd = Math.min(groupStart + PAGE_SIZE - 1, totalPages);
  const hasPrev = groupStart > 1;
  const hasNext = groupEnd < totalPages;

  const pageStyle = (active: boolean): React.CSSProperties => ({
    minWidth: 32, height: 32, padding: '0 6px',
    fontSize: 13, border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400,
  });
  const navStyle: React.CSSProperties = {
    minWidth: 32, height: 32, padding: '0 10px',
    fontSize: 13, border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
  };

  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
      <button onClick={() => onChange(1)} disabled={page === 1} style={{ ...navStyle, opacity: page === 1 ? 0.4 : 1 }}>«</button>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} style={{ ...navStyle, opacity: page === 1 ? 0.4 : 1 }}>‹</button>
      {hasPrev && (
        <button onClick={() => onChange(groupStart - 1)} style={navStyle}>…</button>
      )}
      {Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map((p) => (
        <button key={p} onClick={() => onChange(p)} style={pageStyle(p === page)}>{p}</button>
      ))}
      {hasNext && (
        <button onClick={() => onChange(groupEnd + 1)} style={navStyle}>…</button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} style={{ ...navStyle, opacity: page === totalPages ? 0.4 : 1 }}>›</button>
      <button onClick={() => onChange(totalPages)} disabled={page === totalPages} style={{ ...navStyle, opacity: page === totalPages ? 0.4 : 1 }}>»</button>
    </div>
  );
}

function SortTh({ label, sortKey, current, order, onSort }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  order: 'ASC' | 'DESC';
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        ...thStyle,
        cursor: 'pointer',
        userSelect: 'none',
        color: active ? 'var(--color-text-primary)' : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 10, color: active ? 'var(--color-primary)' : 'var(--color-border)' }}>
        {active ? (order === 'ASC' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--color-bg-input)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)', fontSize: 14,
};
const selectStyle: React.CSSProperties = { ...inputStyle };
const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 500, textAlign: 'left' as const };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };

function btnStyle(variant: 'primary' | 'secondary' | 'danger', size?: 'sm'): React.CSSProperties {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontWeight: 500, transition: 'opacity 0.15s',
    padding: size === 'sm' ? '5px 10px' : '8px 16px',
    fontSize: size === 'sm' ? 12 : 13,
  };
  if (variant === 'primary') return { ...base, background: 'var(--color-primary)', color: '#fff' };
  if (variant === 'danger') return { ...base, background: 'var(--color-danger)', color: '#fff' };
  return { ...base, background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };
}
