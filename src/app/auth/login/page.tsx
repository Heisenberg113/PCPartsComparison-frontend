'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      login(res.access_token, res.refresh_token, res.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card animate-fade-in" style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>Đăng nhập</h1>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Đăng nhập để đánh giá và lưu cấu hình PC
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Email</label>
            <input type="email" className="input" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>Mật khẩu</label>
            <input type="password" className="input" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading ? <Loader2 size={18} /> : <LogIn size={18} />}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <strong>Demo:</strong> demo@pcparts.vn / demo123456
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" style={{ color: 'var(--color-primary-hover)', textDecoration: 'none', fontWeight: 500 }}>Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
