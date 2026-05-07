'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Star, Trash2, LogOut, Edit3, Save, X, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/providers';
import { api, type BuildConfig, type UserReview } from '@/lib/api';
import { formatPrice, formatDate, categoryLabels } from '@/lib/utils';


export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoggedIn, logout } = useAuth();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [builds, setBuilds] = useState<BuildConfig[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingBuilds, setLoadingBuilds] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<'reviews' | 'builds'>('reviews');

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState('');
  const [editHover, setEditHover] = useState(0);

  // Edit build state
  const [editingBuildId, setEditingBuildId] = useState<number | null>(null);
  const [editBuildName, setEditBuildName] = useState('');

  // Expanded builds (to show components)
  const [expandedBuilds, setExpandedBuilds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    if (token) {
      // Fetch reviews
      api.getUserReviews(token)
        .then((data) => setReviews(Array.isArray(data) ? data : []))
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));

      // Fetch builds
      api.getUserBuilds(token)
        .then((data) => setBuilds(Array.isArray(data) ? data : []))
        .catch(() => setBuilds([]))
        .finally(() => setLoadingBuilds(false));
    }
  }, [isLoggedIn, token, router]);

  if (!isLoggedIn) return null;

  // =================== REVIEW HANDLERS ===================
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa đánh giá này?')) return;
    if (!token) return;
    try {
      await api.deleteReview(reviewId, token);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {}
  };

  const startEditReview = (review: UserReview) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditContent(review.content);
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditContent('');
    setEditHover(0);
  };

  const handleUpdateReview = async (reviewId: number) => {
    if (!token) return;
    if (editContent.trim().length < 10) return;
    try {
      await api.updateReview(reviewId, { rating: editRating, content: editContent.trim() }, token);
      setReviews((prev) =>
        prev.map((r) => r.id === reviewId ? { ...r, rating: editRating, content: editContent.trim() } : r)
      );
      cancelEditReview();
    } catch {}
  };

  // =================== BUILD HANDLERS ===================
  const handleDeleteBuild = async (buildId: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa cấu hình này?')) return;
    if (!token) return;
    try {
      await api.deleteBuild(buildId, token);
      setBuilds((prev) => prev.filter((b) => b.id !== buildId));
    } catch {}
  };

  const startEditBuild = (build: BuildConfig) => {
    setEditingBuildId(build.id);
    setEditBuildName(build.name);
  };

  const cancelEditBuild = () => {
    setEditingBuildId(null);
    setEditBuildName('');
  };

  const handleUpdateBuild = async (buildId: number) => {
    if (!token || !editBuildName.trim()) return;
    try {
      await api.updateBuild(buildId, { name: editBuildName.trim() }, token);
      setBuilds((prev) =>
        prev.map((b) => b.id === buildId ? { ...b, name: editBuildName.trim() } : b)
      );
      cancelEditBuild();
    } catch {}
  };

  const toggleBuildExpand = (buildId: number) => {
    setExpandedBuilds((prev) => {
      const next = new Set(prev);
      if (next.has(buildId)) next.delete(buildId);
      else next.add(buildId);
      return next;
    });
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
          flexShrink: 0,
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

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'reviews' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--color-primary)' : '2px solid transparent',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Star size={16} /> Đánh giá ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('builds')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'builds' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'builds' ? '2px solid var(--color-primary)' : '2px solid transparent',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Wrench size={16} /> Cấu hình ({builds.length})
        </button>
      </div>

      {/* =================== REVIEWS TAB =================== */}
      {activeTab === 'reviews' && (
        <>
          {loadingReviews ? (
            <div>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px', marginBottom: '12px' }} />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>💬</p>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Bạn chưa viết đánh giá nào</p>
              <Link href="/products" className="btn btn-primary" style={{ textDecoration: 'none' }}>Xem sản phẩm</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((review) => (
                <div key={review.id} className="card animate-fade-in" style={{ padding: '16px' }}>
                  {editingReviewId === review.id ? (
                    /* ---- Edit Mode ---- */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <Link href={`/products/${review.product?.id}`} style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary-hover)', textDecoration: 'none' }}>
                          {review.product?.name || 'Sản phẩm'}
                        </Link>
                        <button onClick={cancelEditReview} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                          <X size={14} />
                        </button>
                      </div>

                      {/* Star picker */}
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditRating(s)}
                            onMouseEnter={() => setEditHover(s)}
                            onMouseLeave={() => setEditHover(0)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px' }}
                          >
                            <Star
                              size={20}
                              fill={s <= (editHover || editRating) ? '#f59e0b' : 'none'}
                              stroke={s <= (editHover || editRating) ? '#f59e0b' : '#4a4a5a'}
                            />
                          </button>
                        ))}
                      </div>

                      <textarea
                        className="input"
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{ marginBottom: '12px', resize: 'vertical' }}
                      />

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUpdateReview(review.id)} className="btn btn-primary btn-sm">
                          <Save size={13} /> Lưu
                        </button>
                        <button onClick={cancelEditReview} className="btn btn-secondary btn-sm">
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ---- View Mode ---- */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <Link href={`/products/${review.product?.id}`} style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary-hover)', textDecoration: 'none' }}>
                            {review.product?.name || 'Sản phẩm'}
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                              {categoryLabels[review.product?.category] || review.product?.category}
                            </span>
                            <div className="stars">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={12} fill={s <= review.rating ? '#f59e0b' : 'none'} stroke={s <= review.rating ? '#f59e0b' : '#4a4a5a'} />
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => startEditReview(review)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--color-text-muted)' }}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteReview(review.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '4px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{review.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* =================== BUILDS TAB =================== */}
      {activeTab === 'builds' && (
        <>
          {loadingBuilds ? (
            <div>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px', marginBottom: '12px' }} />)}
            </div>
          ) : builds.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>🛠️</p>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Bạn chưa lưu cấu hình nào</p>
              <Link href="/build" className="btn btn-primary" style={{ textDecoration: 'none' }}>Build PC ngay</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {builds.map((build) => (
                <div key={build.id} className="card animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
                  {/* Build header */}
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary-hover)',
                      flexShrink: 0,
                    }}>
                      <Wrench size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingBuildId === build.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="input"
                            value={editBuildName}
                            onChange={(e) => setEditBuildName(e.target.value)}
                            style={{ flex: 1, padding: '6px 10px', fontSize: '14px' }}
                          />
                          <button onClick={() => handleUpdateBuild(build.id)} className="btn btn-primary btn-sm" style={{ padding: '4px 10px' }}>
                            <Save size={13} />
                          </button>
                          <button onClick={cancelEditBuild} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>{build.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {formatDate(build.created_at)} · {Object.keys(build.components || {}).length} linh kiện
                          </div>
                        </>
                      )}
                    </div>

                    <span style={{ fontWeight: 700, color: 'var(--color-primary-hover)', whiteSpace: 'nowrap', fontSize: '15px' }}>
                      {formatPrice(build.total_price)}
                    </span>

                    {editingBuildId !== build.id && (
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        <button onClick={() => toggleBuildExpand(build.id)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--color-text-muted)' }}>
                          {expandedBuilds.has(build.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button onClick={() => startEditBuild(build)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--color-text-muted)' }}>
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeleteBuild(build.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded components list */}
                  {expandedBuilds.has(build.id) && build.components && (
                    <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                      {Object.entries(build.components).map(([key, comp]: [string, any]) => (
                        <div key={key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                        }}>
                          {comp.image_url && (
                            <img
                              src={comp.image_url}
                              alt={comp.name || key}
                              style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-card)', padding: '3px' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="badge badge-primary" style={{ fontSize: '10px', textTransform: 'uppercase', marginRight: '8px' }}>{key}</span>
                            {comp.product_id ? (
                              <Link href={`/products/${comp.product_id}`} style={{ fontSize: '13px', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                                {comp.name || `Product #${comp.product_id}`}
                              </Link>
                            ) : (
                              <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                {comp.name || key}
                              </span>
                            )}
                          </div>
                          {comp.price && (
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              {formatPrice(comp.price)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
