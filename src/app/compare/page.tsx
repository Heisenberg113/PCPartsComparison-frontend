'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { api, combinedRating, type Product } from '@/lib/api';
import { formatPrice, categoryLabels, translateSpec } from '@/lib/utils';
import { useCompare } from '@/lib/providers';

// ─── Constants ──────────────────────────────────────────────

const LOWER_IS_BETTER = new Set([
  'TDP', 'Noise Level', 'CAS Latency', 'Voltage', 'First Word Latency',
]);

const NUMERIC_SPEC_KEYS = new Set([
  'Core Count', 'Thread Count', 'TDP',
  'Base Clock', 'Boost Clock', 'Performance Core Clock', 'Efficient Core Clock',
  'Core Clock', 'Effective Memory Clock',
  'Speed', 'CAS Latency', 'Voltage', 'First Word Latency',
  'Sequential Read', 'Sequential Write', 'Cache', 'RPM',
  'Fan RPM', 'Noise Level', 'CFM', 'Wattage',
  'Memory Slots', 'M.2 Slots', 'SATA 6.0 Gb/s',
  'HDMI Outputs', 'DisplayPort Outputs',
]);

type Section = [label: string, keys: string[]];

const CATEGORY_SECTIONS: Record<string, Section[]> = {
  cpu: [
    ['Hiệu năng', ['Core Count', 'Thread Count', 'Performance Core Clock', 'Boost Clock', 'Base Clock', 'TDP', 'L2 Cache', 'L3 Cache']],
    ['Thông số khác', ['Socket', 'Microarchitecture', 'Lithography', 'Integrated Graphics', 'ECC Support', 'Includes Cooler', 'Packaging']],
  ],
  gpu: [
    ['Hiệu năng', ['Core Clock', 'Boost Clock', 'Memory', 'Memory Type', 'Effective Memory Clock', 'TDP']],
    ['Kết nối', ['HDMI Outputs', 'DisplayPort Outputs', 'Frame Sync', 'Multi-Monitor Support', 'SLI/CrossFire']],
    ['Thông số khác', ['Chipset', 'Cooling', 'External Power', 'Form Factor', 'Length', 'Color']],
  ],
  ram: [
    ['Hiệu năng', ['Speed', 'CAS Latency', 'First Word Latency', 'Timing', 'Voltage']],
    ['Thông số khác', ['Modules', 'Heat Spreader', 'ECC / Registered', 'On-Die ECC', 'Color']],
  ],
  harddrive: [
    ['Hiệu năng', ['Sequential Read', 'Sequential Write', 'Cache', 'RPM']],
    ['Thông số khác', ['Capacity', 'Interface', 'Form Factor', 'NAND Flash Type', 'NVMe']],
  ],
  mainboard: [
    ['Thông số chính', ['Socket / CPU', 'Chipset', 'Form Factor', 'Memory Slots', 'Memory Max', 'Memory Speed']],
    ['Khe & Cổng', ['PCIe x16 Slots', 'PCIe x1 Slots', 'M.2 Slots', 'SATA 6.0 Gb/s', 'Wireless Networking']],
    ['Thông số khác', ['USB 2.0 Headers', 'USB 3.2 Gen 1 Headers', 'USB 3.2 Gen 2 Headers', 'RAID Support', 'Color']],
  ],
  psu: [
    ['Thông số chính', ['Wattage', 'Efficiency Rating', 'Modular', 'Type', 'Fanless']],
    ['Đầu cắm', ['ATX 24-Pin Connectors', 'EPS 8-Pin Connectors', 'PCIe 8-Pin Connectors', 'PCIe 6-Pin Connectors', 'SATA Connectors', 'Molex 4-Pin Connectors']],
  ],
  case: [
    ['Thông số chính', ['Form Factor', 'Motherboard Form Factor', 'Maximum Video Card Length', 'Side Panel']],
    ['Thông số khác', ['Front Panel USB', 'Drive Bays', 'Expansion Slots', 'Includes Power Supply', 'Color']],
  ],
  cooler: [
    ['Hiệu năng', ['Fan RPM', 'CFM', 'Noise Level', 'Radiator Size', 'Static Pressure']],
    ['Thông số khác', ['CPU Socket', 'Water Cooled', 'Bearing Type', 'PWM', 'Color']],
  ],
};

// ─── Helpers ────────────────────────────────────────────────

function extractNumber(val: unknown): number | null {
  if (val == null) return null;
  const matches = String(val).match(/[\d.]+/g);
  if (!matches) return null;
  // For ranges like "800 - 1800 RPM", use the last (max) number
  return parseFloat(matches[matches.length - 1]);
}

function buildSections(products: Product[]): Section[] {
  const category = products[0]?.category ?? '';
  const allKeys = [...new Set(products.flatMap(p => Object.keys(p.specs ?? {})))];
  const defined = CATEGORY_SECTIONS[category] ?? [];
  const usedKeys = new Set(defined.flatMap(([, ks]) => ks));
  const result = defined
    .map(([label, ks]): Section => [label, ks.filter(k => allKeys.includes(k))])
    .filter(([, ks]) => ks.length > 0);
  const rest = allKeys.filter(k => !usedKeys.has(k));
  if (rest.length) {
    const existing = result.find(([label]) => label === 'Thông số khác');
    if (existing) existing[1].push(...rest);
    else result.push(['Thông số khác', rest]);
  }
  return result;
}

// ─── SpecRow ────────────────────────────────────────────────

function SpecRow({ specKey, products, isOdd }: {
  specKey: string;
  products: Product[];
  isOdd: boolean;
}) {
  const rawVals = products.map(p => {
    const v = p.specs?.[specKey];
    if (v == null) return null;
    return Array.isArray(v) ? (v as string[]).join(', ') : String(v);
  });

  const splitVal = (val: string | null) => {
    if (val == null) return null;
    return val.includes(',') ? val.split(',').map(x => x.trim()) : [val];
  };

  const nums = rawVals.map(v => (v !== null ? extractNumber(v) : null));
  const validNums = nums.filter((n): n is number => n !== null);
  const isNumeric = NUMERIC_SPEC_KEYS.has(specKey) && validNums.length >= 2;
  const lowerBetter = LOWER_IS_BETTER.has(specKey);
  const allSame = rawVals.every(v => v === rawVals[0]);

  const maxNum = isNumeric ? Math.max(...validNums) : 0;
  const minNum = isNumeric ? Math.min(...validNums) : 0;

  let winnerIdx = -1;
  if (isNumeric && !allSame && maxNum !== minNum) {
    winnerIdx = nums.reduce<number>((best, n, i) => {
      if (n === null) return best;
      if (best === -1) return i;
      const b = nums[best]!;
      return (lowerBetter ? n < b : n > b) ? i : best;
    }, -1);
  }

  const getAdvantage = (idx: number): number => {
    if (idx !== winnerIdx || !isNumeric) return 0;
    const wNum = nums[idx]!;
    const rivals = nums.filter((n, i): n is number => n !== null && i !== idx);
    if (!rivals.length) return 0;
    const rival = lowerBetter ? Math.min(...rivals) : Math.max(...rivals);
    const d = lowerBetter
      ? ((rival - wNum) / rival) * 100
      : ((wNum - rival) / rival) * 100;
    return Math.max(d, 0);
  };

  const getRivalName = (idx: number): string => {
    if (idx !== winnerIdx || !isNumeric) return '';
    const entries = nums.map((n, i) => ({ n, i })).filter(({ n, i }) => n !== null && i !== idx) as { n: number; i: number }[];
    if (!entries.length) return '';
    const best = lowerBetter
      ? entries.reduce((a, b) => (a.n < b.n ? a : b))
      : entries.reduce((a, b) => (a.n > b.n ? a : b));
    return products[best.i]?.name ?? '';
  };

  return (
    <tr style={{ background: isOdd ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
      <td style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        color: 'var(--color-text-muted)',
        fontSize: 12, fontWeight: 500,
      }}>
        {translateSpec(specKey)}
      </td>
      {products.map((p, idx) => {
        const val = rawVals[idx];
        const valParts = splitVal(val);
        const num = nums[idx];
        const isWinner = winnerIdx === idx;
        const adv = getAdvantage(idx);

        const barPct = isNumeric && num !== null && maxNum > 0
          ? Math.max(lowerBetter ? (minNum / num) * 100 : (num / maxNum) * 100, 5)
          : 0;

        return (
          <td key={p.id} style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border)',
            textAlign: 'center',
            background: isWinner ? 'rgba(16,185,129,0.06)' : 'transparent',
            borderLeft: `2px solid ${isWinner ? 'rgba(16,185,129,0.5)' : 'transparent'}`,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isWinner ? 700 : 400,
                  color: isWinner
                    ? 'var(--color-success)'
                    : val == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                }}>
                  {valParts != null
                    ? valParts.map((part, j, arr) => (
                        <Fragment key={j}>{part}{j < arr.length - 1 && <br />}</Fragment>
                      ))
                    : '—'}
                </span>
                {adv >= 1 && (
                  <span
                    title={`Hơn ${getRivalName(idx)} ${Math.round(adv)}%`}
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
                      background: 'rgba(16,185,129,0.2)', color: 'var(--color-success)',
                      padding: '1px 5px', borderRadius: 4, cursor: 'help',
                    }}
                  >
                    +{Math.round(adv)}%
                  </span>
                )}
              </div>
              {isNumeric && num !== null && (
                <div style={{
                  width: '80%', height: 3, borderRadius: 2,
                  background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`, borderRadius: 2,
                    background: isWinner ? 'var(--color-success)' : 'var(--color-primary)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function ComparePage() {
  const { compareIds, removeFromCompare, clearCompare } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length === 0) { setProducts([]); return; }
    if (compareIds.length === 1) {
      setLoading(true);
      api.getProduct(compareIds[0])
        .then(p => setProducts([p])).catch(() => setProducts([])).finally(() => setLoading(false));
      return;
    }
    setLoading(true);
    api.compareProducts(compareIds)
      .then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, [compareIds]);

  const sections = useMemo(() => buildSections(products), [products]);
  const validPrices = products.map(p => p.base_price).filter(Boolean);
  const minPrice = validPrices.length ? Math.min(...validPrices) : 0;
  const showPlaceholder = products.length === 1;

  if (compareIds.length === 0) {
    return (
      <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>So sánh sản phẩm</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 28 }}>
          Chọn 2–4 sản phẩm cùng loại để so sánh thông số kỹ thuật.
        </p>
        <Link href="/products" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} /> Chọn sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>⚖️ So sánh sản phẩm</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/products" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <Plus size={14} /> Thêm
          </Link>
          <button onClick={clearCompare} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={14} /> Xóa tất cả
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 500 }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            tableLayout: 'fixed', minWidth: 560,
            border: '1px solid var(--color-border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <colgroup>
              <col style={{ width: 160 }} />
              {products.map(p => <col key={p.id} />)}
              {showPlaceholder && <col />}
            </colgroup>

            {/* ── Product header ── */}
            <thead>
              <tr>
                {/* Label column */}
                <th style={{
                  padding: '20px 16px',
                  background: 'var(--color-bg-card)',
                  borderBottom: '2px solid var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                  textAlign: 'left', verticalAlign: 'bottom',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {categoryLabels[products[0]?.category ?? ''] ?? ''}
                  </span>
                </th>

                {/* Product columns */}
                {products.map((p, idx) => (
                  <th key={p.id} style={{
                    padding: '20px 12px 16px',
                    background: 'var(--color-bg-card)',
                    borderBottom: '2px solid var(--color-border)',
                    borderLeft: idx > 0 ? '1px solid var(--color-border)' : 'none',
                    position: 'relative',
                    fontWeight: 'normal',
                    verticalAlign: 'top',
                  }}>
                    {/* VS badge — only for 2 products */}
                    {products.length === 2 && idx === 1 && (
                      <div style={{
                        position: 'absolute', left: -17, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 11,
                        boxShadow: '0 0 14px rgba(99,102,241,0.5)',
                        zIndex: 10,
                      }}>
                        VS
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      {/* Product image */}
                      <img
                        src={p.image_url || 'https://placehold.co/80x80/16161f/6366f1'}
                        alt={p.name}
                        style={{
                          width: 80, height: 80, objectFit: 'contain',
                          borderRadius: 8, background: 'var(--color-bg-secondary)',
                          padding: 8, border: '1px solid var(--color-border)',
                        }}
                      />

                      {/* Product name */}
                      <Link
                        href={`/products/${p.id}`}
                        style={{
                          fontSize: 12, fontWeight: 600, textAlign: 'center',
                          lineHeight: 1.4, color: 'var(--color-primary-hover)',
                          textDecoration: 'none',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}
                      >
                        {p.name}
                      </Link>

                      {/* Price */}
                      {p.base_price > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontSize: 17, fontWeight: 800,
                            color: p.base_price === minPrice && validPrices.length > 1
                              ? 'var(--color-success)' : 'var(--color-text-primary)',
                          }}>
                            {formatPrice(p.base_price)}
                          </span>
                          {p.base_price === minPrice && validPrices.length > 1 && (
                            <span className="badge badge-success" style={{ fontSize: 9 }}>Rẻ nhất</span>
                          )}
                        </div>
                      )}

                      {/* Rating */}
                      {(() => {
                        const { avg, count } = combinedRating(p);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} style={{
                                  fontSize: 13,
                                  color: star <= Math.round(avg) ? '#f59e0b' : 'var(--color-border)',
                                }}>★</span>
                              ))}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {count > 0
                                ? <>{avg.toFixed(1)} <span style={{ opacity: 0.6 }}>({count} đánh giá)</span></>
                                : <span style={{ opacity: 0.5 }}>Chưa có đánh giá</span>
                              }
                            </span>
                          </div>
                        );
                      })()}

                      {/* Remove button */}
                      <button
                        onClick={() => removeFromCompare(p.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)', fontSize: 11, padding: '3px 10px' }}
                      >
                        <Trash2 size={11} /> Bỏ
                      </button>
                    </div>
                  </th>
                ))}

                {/* Placeholder column when only 1 product selected */}
                {showPlaceholder && (
                  <th style={{
                    padding: '20px 12px 16px',
                    background: 'var(--color-bg-card)',
                    borderBottom: '2px solid var(--color-border)',
                    borderLeft: '1px solid var(--color-border)',
                    fontWeight: 'normal',
                    verticalAlign: 'top',
                  }}>
                    <Link href="/products" style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 8px' }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: 8,
                          border: '2px dashed var(--color-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--color-text-muted)',
                        }}>
                          <Plus size={28} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                          Thêm sản phẩm
                        </span>
                      </div>
                    </Link>
                  </th>
                )}
              </tr>
            </thead>

            {/* ── Spec rows ── */}
            <tbody>
              {products.length < 2 ? (
                <tr>
                  <td colSpan={3} style={{
                    padding: '40px 24px', textAlign: 'center',
                    color: 'var(--color-text-muted)', fontSize: 14,
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    Thêm ít nhất 1 sản phẩm nữa để so sánh thông số kỹ thuật
                  </td>
                </tr>
              ) : (
              <>
              {/* ── Benchmark section (CPU / GPU only) ── */}
              {products.some(p => p.benchmark_score != null) && (() => {
                const scores = products.map(p => p.benchmark_score ?? null);
                const validScores = scores.filter((s): s is number => s !== null);
                const maxScore = Math.max(...validScores);
                const minScore = Math.min(...validScores);
                const winnerIdx = scores.reduce<number>((best, s, i) => {
                  if (s === null) return best;
                  if (best === -1) return i;
                  return s > (scores[best] ?? 0) ? i : best;
                }, -1);
                const category = products[0]?.category ?? '';
                const gradient = category === 'cpu'
                  ? 'linear-gradient(to right,#8b5cf6,#6366f1)'
                  : 'linear-gradient(to right,#06b6d4,#10b981)';

                return (
                  <Fragment>
                    <tr>
                      <td colSpan={products.length + 1} style={{
                        padding: '11px 16px',
                        background: 'rgba(99,102,241,0.08)',
                        borderTop: '2px solid var(--color-border)',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                        textTransform: 'uppercase', color: 'var(--color-primary)',
                      }}>
                        🏆 Benchmark PassMark
                      </td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        borderRight: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontSize: 12, fontWeight: 500,
                      }}>
                        {category === 'cpu' ? 'CPU Mark' : 'GPU Mark'}
                      </td>
                      {products.map((p, idx) => {
                        const score = scores[idx];
                        const isWinner = winnerIdx === idx && maxScore !== minScore;
                        const barPct = score != null && maxScore > 0
                          ? Math.max((score / maxScore) * 100, 5)
                          : 0;
                        let rivalBenchName = '';
                        const adv = isWinner && score != null && validScores.length >= 2
                          ? (() => {
                              let rivalScore = 0;
                              scores.forEach((s, i) => {
                                if (s !== null && i !== idx && s > rivalScore) {
                                  rivalScore = s;
                                  rivalBenchName = products[i]?.name ?? '';
                                }
                              });
                              return rivalScore > 0 ? ((score - rivalScore) / rivalScore) * 100 : 0;
                            })()
                          : 0;
                        return (
                          <td key={p.id} style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--color-border)',
                            textAlign: 'center',
                            background: isWinner ? 'rgba(16,185,129,0.06)' : 'transparent',
                            borderLeft: `2px solid ${isWinner ? 'rgba(16,185,129,0.5)' : 'transparent'}`,
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  fontSize: 15, fontWeight: isWinner ? 800 : 600,
                                  color: isWinner ? 'var(--color-success)' : score == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                }}>
                                  {score != null ? Math.round(score).toLocaleString('vi-VN') : '—'}
                                </span>
                                {adv >= 1 && (
                                  <span
                                    title={`Hơn ${rivalBenchName} ${Math.round(adv)}%`}
                                    style={{
                                      fontSize: 9, fontWeight: 700,
                                      background: 'rgba(16,185,129,0.2)', color: 'var(--color-success)',
                                      padding: '1px 5px', borderRadius: 4, cursor: 'help',
                                    }}
                                  >
                                    +{Math.round(adv)}%
                                  </span>
                                )}
                              </div>
                              {score != null && (
                                <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', width: `${barPct}%`, borderRadius: 2,
                                    background: isWinner ? 'var(--color-success)' : gradient,
                                    transition: 'width 0.6s ease',
                                  }} />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })()}

              {sections.map(([sectionLabel, keys], sectionIdx) => (
                <Fragment key={sectionIdx}>
                  {/* Section header */}
                  <tr>
                    <td colSpan={products.length + 1} style={{
                      padding: '11px 16px',
                      background: 'rgba(99,102,241,0.08)',
                      borderTop: '2px solid var(--color-border)',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: 'var(--color-primary)',
                    }}>
                      {sectionLabel}
                    </td>
                  </tr>

                  {keys.map((key, i) => (
                    <SpecRow key={key} specKey={key} products={products} isOdd={i % 2 !== 0} />
                  ))}
                </Fragment>
              ))}
              </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
