'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/providers';
import { api, type AdminReview } from '@/lib/api';

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.adminGetReviews(token, { page, limit: 20 });
      setReviews(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch {
      // lỗi được hiện ở loading state
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.adminDeleteReview(token, id);
      setDeleteId(null);
      fetchReviews();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Kiểm duyệt Review</h1>

      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        {total.toLocaleString()} review
      </div>

      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'var(--color-bg-secondary)' }}>
            <tr style={{ color: 'var(--color-text-muted)' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Sản phẩm</th>
              <th style={thStyle}>Người dùng</th>
              <th style={thStyle}>Điểm</th>
              <th style={thStyle}>Nội dung</th>
              <th style={thStyle}>Ngày</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Đang tải...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Không có review</td></tr>
            ) : reviews.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={tdStyle}>{r.id}</td>
                <td style={{ ...tdStyle, maxWidth: 180 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                    {r.product?.name ?? '—'}
                  </div>
                </td>
                <td style={tdStyle}>{r.user?.username ?? '—'}</td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--color-warning)' }}>{'★'.repeat(r.rating)}</span>
                  <span style={{ color: 'var(--color-border)' }}>{'★'.repeat(5 - r.rating)}</span>
                  <span style={{ marginLeft: 4, color: 'var(--color-text-muted)' }}>{r.rating}/5</span>
                </td>
                <td style={{ ...tdStyle, maxWidth: 300 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(r.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setDeleteId(r.id)} style={dangerBtnStyle}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} style={{
              padding: '5px 10px', fontSize: 12, border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: p === page ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
              color: p === page ? '#fff' : 'var(--color-text-secondary)',
            }}>{p}</button>
          ))}
        </div>
      )}

      {deleteId != null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 28, width: 360 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Xác nhận xóa</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }}>
              Xóa review #{deleteId}? Thao tác không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={secBtnStyle}>Hủy</button>
              <button onClick={() => handleDelete(deleteId)} style={dangerBtnStyle}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 500, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };
const dangerBtnStyle: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, border: 'none', borderRadius: 'var(--radius-sm)',
  background: 'var(--color-danger)', color: '#fff', cursor: 'pointer',
};
const secBtnStyle: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-elevated)',
  color: 'var(--color-text-secondary)', cursor: 'pointer',
};
