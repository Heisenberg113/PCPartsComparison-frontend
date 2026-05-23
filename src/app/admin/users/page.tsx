'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/providers';
import { api, type AdminUser } from '@/lib/api';

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [roleLoading, setRoleLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.adminGetUsers(token, { page, limit: 20, search: search || undefined });
      setUsers(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch {
      // lỗi được hiện ở loading state
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleToggleRole(u: AdminUser) {
    if (!token) return;
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setRoleLoading(u.id);
    try {
      await api.adminSetUserRole(token, u.id, newRole);
      fetchUsers();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setRoleLoading(null);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.adminDeleteUser(token, id);
      setDeleteId(null);
      fetchUsers();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Quản lý người dùng</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Tìm theo email hoặc tên..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={inputStyle}
        />
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        {total.toLocaleString()} người dùng
      </div>

      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'var(--color-bg-secondary)' }}>
            <tr style={{ color: 'var(--color-text-muted)' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Tên người dùng</th>
              <th style={thStyle}>Quyền</th>
              <th style={thStyle}>Ngày tạo</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Không có người dùng</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={tdStyle}>{u.id}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.username}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: u.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                    color: u.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: `1px solid ${u.role === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}>
                    {u.role === 'admin' ? 'Admin' : 'Người dùng'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleToggleRole(u)}
                      disabled={roleLoading === u.id || u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? 'Không thể tự thay đổi quyền' : ''}
                      style={{
                        padding: '5px 10px', fontSize: 12, border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                        background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
                        opacity: u.id === currentUser?.id ? 0.5 : 1,
                      }}
                    >
                      {roleLoading === u.id ? '...' : (u.role === 'admin' ? 'Hạ quyền' : 'Cấp Admin')}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => setDeleteId(u.id)} style={dangerBtnStyle}>Xóa</button>
                    )}
                  </div>
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
              Xóa người dùng #{deleteId}? Tất cả review và build của người này cũng sẽ bị xóa.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '8px 16px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => handleDelete(deleteId)} style={dangerBtnStyle}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: 280, padding: '8px 12px', background: 'var(--color-bg-input)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)', fontSize: 14,
};
const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 500, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };
const dangerBtnStyle: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, border: 'none',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: '#fff', cursor: 'pointer',
};
