'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Star, Trash2, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api';
import { formatPrice, formatDate, categoryLabels } from '@/lib/utils';

interface UserReview {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  product: { id: number; name: string; category: string; base_price: number };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoggedIn, logout } = useAuth();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    // Fetch user reviews
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reviews/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setReviews(Array.isArray(data) ? data : []))
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    }
  }, [isLoggedIn, token, router]);

  if (!isLoggedIn) return null;

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa review này?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {}
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: '800px' }}>
      {/* Profile Header */}
      <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 700,
          color: 'white',
        }}>
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{user?.username}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{user?.email}</p>
          <span className="badge badge-primary" style={{ marginTop: '4px' }}>{user?.role}</span>
        </div>
        <button onClick={() => { logout(); router.push('/'); }} className="btn btn-danger btn-sm">
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>

      {/* Reviews */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
        💬 Đánh giá của bạn ({reviews.length})
      </h2>

      {loading ? (
        <div>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px', marginBottom: '12px' }} />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Bạn chưa viết đánh giá nào</p>
          <Link href="/products" className="btn btn-primary" style={{ textDecoration: 'none' }}>Xem sản phẩm</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map((review) => (
            <div key={review.id} className="card animate-fade-in" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <Link href={`/products/${review.product?.id}`} style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary-hover)', textDecoration: 'none' }}>
                    {review.product?.name || 'Sản phẩm'}
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '10px' }}>{review.product?.category}</span>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} fill={s <= review.rating ? '#f59e0b' : 'none'} stroke={s <= review.rating ? '#f59e0b' : '#4a4a5a'} />
                      ))}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(review.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteReview(review.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '4px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
