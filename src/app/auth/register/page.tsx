'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register({ email, username, password });
      login(res.access_token, res.refresh_token, res.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card animate-fade-in" style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>Đăng ký</h1>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Tạo tài khoản để đánh giá sản phẩm và lưu cấu hình
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Email</label>
            <input type="email" className="input" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Tên hiển thị</label>
            <input type="text" className="input" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Mật khẩu</label>
            <input type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading ? <Loader2 size={18} /> : <UserPlus size={18} />}
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Đã có tài khoản?{' '}
          <Link href="/auth/login" style={{ color: 'var(--color-primary-hover)', textDecoration: 'none', fontWeight: 500 }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
