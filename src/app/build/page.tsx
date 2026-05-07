'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wrench, DollarSign, Loader2, Save, Check } from 'lucide-react';
import { api, type BuildSuggestion } from '@/lib/api';
import { formatPrice, categoryLabels } from '@/lib/utils';
import { useAuth } from '@/lib/providers';

const PURPOSES = [
  { key: 'gaming', label: '🎮 Gaming', desc: 'Ưu tiên GPU mạnh cho game AAA' },
  { key: 'workstation', label: '💼 Workstation', desc: 'Ưu tiên CPU & RAM cho render, compile' },
  { key: 'office', label: '🏢 Văn phòng', desc: 'Cân bằng, giá tốt, đủ dùng' },
  { key: 'streaming', label: '📺 Streaming', desc: 'CPU + GPU mạnh cho stream + game' },
];

const BUDGETS = [10000000, 15000000, 20000000, 25000000, 30000000, 40000000, 50000000];

export default function BuildPage() {
  const { token, isLoggedIn } = useAuth();
  const [budget, setBudget] = useState(20000000);
  const [customBudget, setCustomBudget] = useState('');
  const [purpose, setPurpose] = useState('gaming');
  const [result, setResult] = useState<BuildSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save build state
  const [buildName, setBuildName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSuggest = async () => {
    const finalBudget = customBudget ? parseInt(customBudget) : budget;
    if (finalBudget < 5000000) {
      setError('Ngân sách tối thiểu là 5,000,000 VND');
      return;
    }
    setError('');
    setSaveSuccess(false);
    setSaveError('');
    setLoading(true);
    try {
      const suggestion = await api.suggestBuild(finalBudget, purpose);
      setResult(suggestion);
      // Auto-generate a build name
      const purposeLabel = PURPOSES.find((p) => p.key === purpose)?.label?.replace(/^[^\s]+\s/, '') || purpose;
      setBuildName(`${purposeLabel} ${formatPrice(finalBudget)}`);
    } catch (e: any) {
      setError(e.message || 'Không thể gợi ý cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBuild = async () => {
    if (!token || !result) return;
    if (!buildName.trim()) {
      setSaveError('Vui lòng nhập tên cấu hình');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Convert components to { category: productId } format
      const components: Record<string, any> = {};
      for (const [key, comp] of Object.entries(result.components)) {
        components[key] = {
          product_id: comp.product.id,
          name: comp.product.name,
          price: comp.product.base_price,
          image_url: comp.product.image_url,
        };
      }

      await api.saveBuild({
        name: buildName.trim(),
        components,
        total_price: result.total_price,
      }, token);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setSaveError(err.message || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Wrench size={28} /> Build PC Wizard
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
        Chọn ngân sách và mục đích — hệ thống sẽ gợi ý cấu hình tối ưu cho bạn.
      </p>

      {/* Purpose Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Mục đích sử dụng</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {PURPOSES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPurpose(p.key)}
              className={`card ${purpose === p.key ? '' : 'card-interactive'}`}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: purpose === p.key ? '2px solid var(--color-primary)' : undefined,
                background: purpose === p.key ? 'rgba(99, 102, 241, 0.05)' : undefined,
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{p.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
          <DollarSign size={16} style={{ display: 'inline' }} /> Ngân sách
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => { setBudget(b); setCustomBudget(''); }}
              className={`btn btn-sm ${budget === b && !customBudget ? 'btn-primary' : 'btn-secondary'}`}
            >
              {formatPrice(b)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="input"
            placeholder="Hoặc nhập ngân sách tùy chỉnh..."
            value={customBudget}
            onChange={(e) => setCustomBudget(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>VND</span>
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

      <button onClick={handleSuggest} disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: '32px' }}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
        {loading ? 'Đang tính toán...' : 'Gợi ý cấu hình'}
      </button>

      {/* =================== RESULT =================== */}
      {result && (
        <div className="animate-slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>🎯 Cấu hình gợi ý</h2>
            <span className={`badge ${result.within_budget ? 'badge-success' : 'badge-warning'}`}>
              {result.within_budget ? '✅ Trong ngân sách' : '⚠️ Vượt ngân sách'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {Object.entries(result.components).map(([key, comp]) => (
              <div key={key} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                <img
                  src={comp.product.image_url || 'https://placehold.co/60x60/1a1a2e/6366f1'}
                  alt={comp.product.name}
                  style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: 'var(--color-bg-secondary)', padding: '6px' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{key}</span>
                    {comp.over_budget && <span className="badge badge-warning" style={{ fontSize: '10px' }}>Vượt ngân sách phần này</span>}
                  </div>
                  <Link href={`/products/${comp.product.id}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                    {comp.product.name}
                  </Link>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-hover)', whiteSpace: 'nowrap' }}>
                  {formatPrice(comp.product.base_price)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-bg-elevated)',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Tổng chi phí</span>
            <span style={{ fontSize: '24px', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatPrice(result.total_price)}
            </span>
          </div>

          {/* =================== SAVE BUILD =================== */}
          {isLoggedIn ? (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={16} /> Lưu cấu hình
              </h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Đặt tên cho cấu hình này..."
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSaveBuild}
                  disabled={saving || saveSuccess}
                  className={`btn ${saveSuccess ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ whiteSpace: 'nowrap', minWidth: '140px' }}
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> Đang lưu...</>
                  ) : saveSuccess ? (
                    <><Check size={16} /> Đã lưu!</>
                  ) : (
                    <><Save size={16} /> Lưu cấu hình</>
                  )}
                </button>
              </div>
              {saveError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '8px' }}>{saveError}</p>
              )}
              {saveSuccess && (
                <p style={{ color: 'var(--color-success)', fontSize: '13px', marginTop: '8px' }}>
                  ✅ Đã lưu thành công! Xem tại <Link href="/profile" style={{ color: 'var(--color-primary-hover)', textDecoration: 'underline' }}>trang cá nhân</Link>.
                </p>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                💾 <Link href="/auth/login" style={{ color: 'var(--color-primary-hover)', textDecoration: 'underline' }}>Đăng nhập</Link> để lưu cấu hình này.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
