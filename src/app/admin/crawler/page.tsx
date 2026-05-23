'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api';

interface MissingProduct { id: number; name: string; category: string; brand: string; }
interface RecentProduct { id: number; name: string; category: string; brand: string; last_crawled: string; shop_count: number; min_price: number; }

const CATEGORY_LABEL: Record<string, string> = {
  cpu: 'CPU', gpu: 'GPU', ram: 'RAM', harddrive: 'Ổ cứng',
  mainboard: 'Mainboard', psu: 'Nguồn', case: 'Case', cooler: 'Tản nhiệt', monitor: 'Màn hình',
};

export default function AdminCrawlerPage() {
  const { token } = useAuth();

  // Live status
  const [isCrawling, setIsCrawling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [recentlyCrawled, setRecentlyCrawled] = useState<RecentProduct[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Actions
  const [productId, setProductId] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Missing prices
  const [missing, setMissing] = useState<MissingProduct[] | null>(null);
  const [missingLoading, setMissingLoading] = useState(false);
  const [showMissingList, setShowMissingList] = useState(false);

  // Poll status every 2s while crawling, 5s while idle
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await api.adminGetCrawlStatus(token);
      setIsCrawling(status.isCrawling);
      setLogs(status.logs);
      setRecentlyCrawled(status.recentlyCrawled ?? []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, isCrawling ? 2000 : 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus, isCrawling]);

  // Auto-scroll log box to bottom
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  // Reset poll interval when crawl state changes
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, isCrawling ? 2000 : 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isCrawling, fetchStatus]);

  async function runAction(key: string, fn: () => Promise<unknown>) {
    setActionLoading(key);
    try {
      await fn();
      await fetchStatus();
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] ${e.message}`]);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    if (!token) return;
    try {
      await api.adminStopCrawl(token);
    } catch { /* ignore */ }
  }

  async function handleCheckMissing() {
    if (!token) return;
    setMissingLoading(true);
    setShowMissingList(false);
    try {
      const res = await api.adminGetProductsWithoutPrices(token);
      setMissing(res);
      setShowMissingList(true);
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] ${e.message}`]);
    } finally {
      setMissingLoading(false);
    }
  }

  const busy = (key: string) => actionLoading === key;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

      {/* ── Left: action panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Crawler</h1>
          {isCrawling && (
            <button onClick={handleStop} style={dangerBtn}>
              ⏹ Dừng crawl
            </button>
          )}
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          borderRadius: 99, fontSize: 12, fontWeight: 600,
          background: isCrawling ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isCrawling ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
          color: isCrawling ? 'var(--color-success)' : 'var(--color-text-muted)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isCrawling ? 'var(--color-success)' : 'var(--color-text-muted)',
            animation: isCrawling ? 'pulse 1.5s infinite' : 'none',
          }} />
          {isCrawling ? 'Đang chạy' : 'Không hoạt động'}
        </div>

        {/* Crawl all */}
        <ActionCard title="Crawl tất cả sản phẩm" desc="Crawl toàn bộ danh sách sản phẩm trong CSDL.">
          <button disabled={isCrawling || busy('all')} style={primaryBtn(isCrawling || busy('all'))}
            onClick={() => runAction('all', () => api.adminCrawlAll(token!))}>
            {busy('all') ? '...' : '▶ Bắt đầu'}
          </button>
        </ActionCard>

        {/* Crawl one */}
        <ActionCard title="Crawl 1 sản phẩm" desc="Nhập ID sản phẩm cần crawl.">
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" placeholder="Product ID" value={productId}
              onChange={e => setProductId(e.target.value)} style={{ ...inputSt, flex: 1 }} />
            <button disabled={isCrawling || busy('one') || !productId} style={primaryBtn(isCrawling || busy('one') || !productId)}
              onClick={() => runAction('one', () => api.adminCrawlOne(token!, Number(productId)))}>
              {busy('one') ? '...' : '▶'}
            </button>
          </div>
        </ActionCard>

        {/* Crawl range */}
        <ActionCard title="Crawl theo khoảng ID" desc="Từ ID → Đến ID (tuỳ chọn).">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="number" placeholder="Từ" value={rangeFrom}
              onChange={e => setRangeFrom(e.target.value)} style={{ ...inputSt, width: 80 }} />
            <input type="number" placeholder="Đến" value={rangeTo}
              onChange={e => setRangeTo(e.target.value)} style={{ ...inputSt, width: 80 }} />
            <button disabled={isCrawling || busy('range')} style={primaryBtn(isCrawling || busy('range'))}
              onClick={() => runAction('range', () => api.adminCrawlRange(token!, rangeFrom ? +rangeFrom : undefined, rangeTo ? +rangeTo : undefined))}>
              {busy('range') ? '...' : '▶'}
            </button>
          </div>
        </ActionCard>

        {/* Missing prices */}
        <ActionCard title="Sản phẩm chưa có giá"
          desc="Kiểm tra & crawl những sản phẩm chưa có bất kỳ bản ghi giá nào.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button disabled={missingLoading} style={{ ...primaryBtn(missingLoading), background: 'var(--color-accent)' }}
              onClick={handleCheckMissing}>
              {missingLoading ? '...' : '🔍 Kiểm tra'}
            </button>
            {missing !== null && (
              <button disabled={isCrawling || busy('missing') || missing.length === 0}
                style={primaryBtn(isCrawling || busy('missing') || missing.length === 0)}
                onClick={() => runAction('missing', () => api.adminCrawlMissingPrices(token!))}>
                {busy('missing') ? '...' : `▶ Crawl ${missing.length} SP`}
              </button>
            )}
          </div>
          {missing !== null && (
            <div style={{ marginTop: 8, fontSize: 12, color: missing.length > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {missing.length === 0
                ? '✅ Tất cả sản phẩm đã có giá'
                : `⚠️ ${missing.length} sản phẩm chưa có giá`}
              {missing.length > 0 && (
                <button onClick={() => setShowMissingList(v => !v)}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12 }}>
                  {showMissingList ? 'Ẩn' : 'Xem'}
                </button>
              )}
            </div>
          )}
          {showMissingList && missing && missing.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', fontSize: 12, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
              {missing.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--color-text-muted)', width: 32 }}>#{p.id}</span>
                  <span style={{ color: 'var(--color-text-muted)', width: 60, flexShrink: 0 }}>{CATEGORY_LABEL[p.category] ?? p.category}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </ActionCard>

        {/* Recently crawled */}
        {recentlyCrawled.length > 0 && (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600 }}>
              Sản phẩm vừa crawl
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {recentlyCrawled.map((p) => (
                <div key={p.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--color-text-muted)', marginRight: 5 }}>#{p.id}</span>
                      {p.name}
                    </span>
                    <span style={{ color: 'var(--color-success)', flexShrink: 0, fontWeight: 600 }}>
                      {p.min_price ? p.min_price.toLocaleString('vi-VN') + '₫' : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                    <span>{CATEGORY_LABEL[p.category] ?? p.category} · {p.shop_count} shop</span>
                    <span>{timeAgo(p.last_crawled)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cron info */}
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-secondary)' }}>Cron tự động:</strong> 2:00 AM hằng ngày<br />
          Chiến lược: mỗi category lấy 100 SP có giá cũ nhất (ưu tiên SP chưa có giá).
        </div>
      </div>

      {/* ── Right: live log ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Log ({logs.length} dòng)
          </span>
          <button onClick={() => setLogs([])} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Xoá log
          </button>
        </div>
        <div
          ref={logBoxRef}
          style={{
            height: 'calc(100vh - 220px)',
            minHeight: 400,
            background: '#0d0d14',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.7,
            color: '#c8c8d8',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: 'var(--color-text-muted)' }}>Chưa có log. Bắt đầu crawl để xem tiến trình...</span>
          ) : logs.map((line, i) => (
            <div key={i} style={{ color: logColor(line) }}>{line}</div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function logColor(line: string): string {
  if (line.includes('✅') || line.includes('🏁')) return '#10b981';
  if (line.includes('❌') || line.includes('[ERROR]')) return '#ef4444';
  if (line.includes('⚠️')) return '#f59e0b';
  if (line.includes('♻️') || line.includes('🔍')) return '#06b6d4';
  if (line.includes('🛑')) return '#f87171';
  if (line.includes('🚀') || line.includes('📋')) return '#818cf8';
  return '#c8c8d8';
}

function ActionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{desc}</div>
      {children}
    </div>
  );
}

const inputSt: React.CSSProperties = {
  padding: '7px 10px', background: 'var(--color-bg-input)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)', fontSize: 13,
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', fontSize: 13, border: 'none', borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 500,
    background: disabled ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
    color: disabled ? 'var(--color-text-muted)' : '#fff',
    opacity: disabled ? 0.7 : 1,
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

const dangerBtn: React.CSSProperties = {
  padding: '6px 14px', fontSize: 12, border: 'none', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', fontWeight: 600,
  background: 'var(--color-danger)', color: '#fff',
};
