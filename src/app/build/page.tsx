'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import {
  Wrench, DollarSign, Loader2, Save, Check, ChevronDown, ChevronUp,
  RefreshCw, Plus, X, AlertTriangle, Info, Search, Edit2,
} from 'lucide-react';
import { api, type BuildSuggestion, type Product, type BuildComponent } from '@/lib/api';
import { formatPrice, categoryLabels } from '@/lib/utils';
import { useAuth } from '@/lib/providers';

const PURPOSES = [
  { key: 'gaming',      label: '🎮 Gaming',     desc: 'Ưu tiên GPU mạnh cho game AAA' },
  { key: 'workstation', label: '💼 Workstation', desc: 'CPU & RAM cho render, compile' },
  { key: 'office',      label: '🏢 Văn phòng',  desc: 'Cân bằng, giá tốt, đủ dùng' },
  { key: 'streaming',   label: '📺 Streaming',  desc: 'CPU + GPU cho stream + game' },
];

const BUDGETS = [10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000, 40_000_000, 50_000_000];

const COMPONENT_ORDER = ['cpu', 'cooler', 'mainboard', 'ram', 'gpu', 'harddrive', 'psu', 'case'];

const RATIO_COLORS: Record<string, string> = {
  gpu: '#6366f1', cpu: '#8b5cf6', ram: '#06b6d4', mainboard: '#10b981',
  harddrive: '#f59e0b', psu: '#ef4444', case: '#64748b', cooler: '#0ea5e9',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentEntry = { product: Product; quantity: number };
type ExistingMap = Record<string, { product: Product } | null>;

// ─── Compatibility helpers ────────────────────────────────────────────────────

function parseM2SizeFF(ff: string): string | null {
  const m = (ff || '').match(/M\.2-?(\d+)/i);
  return m ? m[1] : null;
}
// Parse "2280" → {w:22, l:80}, "22110" → {w:22, l:110}, "2580" → {w:25, l:80}
function parseM2Dims(size: string): { w: number; l: number } | null {
  const m = size.match(/^(\d{2})(\d{2,3})$/);
  if (!m) return null;
  return { w: parseInt(m[1]), l: parseInt(m[2]) };
}
// A 22mm drive fits any slot with length ≥ drive length (including 25mm wide slots).
// A 25mm drive only fits 25mm slots with length ≥ drive length.
function m2DriveFitsSlot(driveSize: string, slotSize: string): boolean {
  if (driveSize === slotSize) return true;
  const drive = parseM2Dims(driveSize);
  const slot = parseM2Dims(slotSize);
  if (!drive || !slot) return false;
  return slot.l >= drive.l && (slot.w === drive.w || (drive.w === 22 && slot.w === 25));
}
function m2SlotFits(size: string, slots: string[]): boolean {
  return slots.some((s) =>
    s.replace(/[^0-9/]/g, '').split('/').filter(Boolean).some((n) => m2DriveFitsSlot(size, n))
  );
}
function mbM2Slots(mb: Product): string[] {
  const s = mb.specs?.['M.2 Slots'];
  if (!s) return [];
  if (Array.isArray(s)) return s as string[];
  return [String(s)];
}
function mbSataPorts(mb: Product): number {
  return parseInt(String(mb.specs?.['SATA 6.0 Gb/s Ports'] ?? '0').replace(/[^0-9]/g, '') || '0', 10);
}

function parseTDP(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v;
  const m = (v || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

type PowerParams = {
  cpu?: Product | null;
  gpu?: Product | null;
  mb?: Product | null;
  ramItems?: (Product | null)[];
  hddItems?: (Product | null)[];
  cooler?: Product | null;
};

function calcSystemPower(p: PowerParams): { cpuTdp: number; gpuTdp: number; baseline: number; estimated: number; recommended: number } {
  const cpuTdp = parseTDP(p.cpu?.specs?.['TDP']) || 0;
  const gpuTdp = parseTDP(p.gpu?.specs?.['TDP']) || 0;
  let baseline = p.mb ? 50 : 0;
  for (const r of (p.ramItems ?? [])) {
    if (r) baseline += getRamCapacity(r).sticks * 15;
  }
  for (const h of (p.hddItems ?? [])) {
    if (!h) continue;
    baseline += (h.specs?.['Form Factor'] ?? '').startsWith('3.5') ? 20 : 10;
  }
  if (p.cooler) baseline += 15;
  const estimated = cpuTdp + gpuTdp + baseline;
  const recommended = Math.ceil((estimated * 1.2) / 50) * 50;
  return { cpuTdp, gpuTdp, baseline, estimated, recommended };
}

function getPsuPowerTag(p: PowerParams, psu: Product): string {
  const { cpuTdp, gpuTdp, estimated, recommended } = calcSystemPower(p);
  const psuWatts = parseTDP(psu?.specs?.['Wattage']) || 0;
  if (psuWatts === 0 || (cpuTdp === 0 && gpuTdp === 0)) return `~${estimated}W ước tính`;
  return psuWatts >= recommended ? `✓ Đủ tải (~${estimated}W)` : `⚠ Cần ≥${recommended}W (~${estimated}W)`;
}

// Read CPU socket from specs — tries all common key names
function getCpuSocket(specs?: Record<string, any>): string | null {
  return specs?.['Socket'] ?? specs?.socket ?? null;
}
// Read mainboard socket from specs — tries all common key names
function getMbSocket(specs?: Record<string, any>): string | null {
  return specs?.['Socket / CPU'] ?? specs?.['Socket'] ?? specs?.socket_cpu ?? specs?.socket ?? null;
}
// Returns true if CPU specs indicate no bundled cooler
function cpuNeedsCooler(cpu: Product): boolean {
  const ic = cpu.specs?.['Includes Cooler'] ?? cpu.specs?.['Includes CPU Cooler'];
  return ic === 'No' || ic === false;
}

/** Returns { ok, reason } for a candidate product given already-selected components */
function checkCompat(product: Product, category: string, existing: ExistingMap): { ok: boolean; reason?: string } {
  const cpu = existing['cpu']?.product;
  const mb  = existing['mainboard']?.product;

  if (category === 'mainboard' && cpu) {
    const cs = getCpuSocket(cpu.specs);
    const ms = getMbSocket(product.specs);
    if (cs && ms && cs !== ms) return { ok: false, reason: `CPU socket ${cs} ≠ Mainboard socket ${ms}` };
  }
  if (category === 'cpu' && mb) {
    const cs = getCpuSocket(product.specs);
    const ms = getMbSocket(mb.specs);
    if (cs && ms && cs !== ms) return { ok: false, reason: `CPU socket ${cs} ≠ Mainboard socket ${ms}` };
  }
  if (category === 'ram' && mb) {
    const mbType = mb.specs?.['Memory Type'] ?? mb.specs?.memory_type ?? '';
    const speed  = product.specs?.['Speed'] ?? product.specs?.speed ?? '';
    if (mbType && speed && !speed.toUpperCase().startsWith(mbType.toUpperCase()))
      return { ok: false, reason: `RAM ${speed} ≠ loại ${mbType} của mainboard` };
  }
  if (category === 'harddrive' && mb) {
    const ff   = product.specs?.['Form Factor'] ?? '';
    const size = parseM2SizeFF(ff);
    if (size) {
      const slots = mbM2Slots(mb);
      if (slots.length === 0) return { ok: false, reason: 'Mainboard không có khe M.2' };
      if (!m2SlotFits(size, slots)) return { ok: false, reason: `Khe M.2-${size} không có trên mainboard` };
    } else if (ff.startsWith('2.5') || ff.startsWith('3.5')) {
      if (mbSataPorts(mb) === 0) return { ok: false, reason: 'Mainboard không có cổng SATA' };
    }
  }
  if (category === 'cooler' && cpu) {
    const cpuSocket = getCpuSocket(cpu.specs);
    const coolerSockets = product.specs?.['CPU Socket'];
    if (cpuSocket && coolerSockets) {
      const sockets: string[] = Array.isArray(coolerSockets) ? coolerSockets : [String(coolerSockets)];
      if (!sockets.includes(cpuSocket)) return { ok: false, reason: `Tản nhiệt không hỗ trợ socket ${cpuSocket}` };
    }
  }
  return { ok: true };
}

/** Derives API spec_filter + optional client-side filter for the picker */
function getPickerFilters(category: string, existing: ExistingMap): {
  specFilter?: string;
  clientFilter?: (p: Product) => boolean;
} {
  const cpu = existing['cpu']?.product;
  const mb  = existing['mainboard']?.product;

  if (category === 'mainboard' && cpu) {
    const socket = cpu.specs?.['Socket'] ?? cpu.specs?.socket;
    if (socket) return { specFilter: JSON.stringify({ 'Socket / CPU': socket }) };
  }
  if (category === 'cpu' && mb) {
    const socket = mb.specs?.['Socket / CPU'] ?? mb.specs?.socket_cpu;
    if (socket) return { specFilter: JSON.stringify({ Socket: socket }) };
  }
  if (category === 'ram' && mb) {
    const mbType = mb.specs?.['Memory Type'] ?? mb.specs?.memory_type ?? '';
    if (mbType) return { clientFilter: (p) => (p.specs?.['Speed'] ?? p.specs?.speed ?? '').toUpperCase().startsWith(mbType.toUpperCase()) };
  }
  if (category === 'harddrive' && mb) {
    const slots = mbM2Slots(mb);
    const sata  = mbSataPorts(mb);
    return {
      clientFilter: (p) => {
        const ff   = p.specs?.['Form Factor'] ?? '';
        const size = parseM2SizeFF(ff);
        if (size) return slots.length > 0 && m2SlotFits(size, slots);
        if (ff.startsWith('2.5') || ff.startsWith('3.5')) return sata > 0;
        return true;
      },
    };
  }
  return {};
}

/** Key compatibility specs to display per category — mirrors PCPartPicker's "From parametric filter" */
function getCompatDetails(category: string, product: Product): string[] {
  const s = product.specs ?? {};
  const items: string[] = [];
  switch (category) {
    case 'cpu': {
      const socket = s['Socket'] ?? s['socket'];
      const cores = s['Core Count'] ?? s['Cores'];
      const threads = s['Thread Count'] ?? s['Threads'];
      const tdp = s['TDP'];
      const igpu = s['Integrated Graphics'] ?? s['integrated_graphics'];
      const hasCooler = s['Includes Cooler'] ?? s['Includes CPU Cooler'];
      if (socket) items.push(`Socket: ${socket}`);
      if (cores) items.push(`${cores}C${threads ? `/${threads}T` : ''}`);
      if (tdp) items.push(`TDP: ${tdp}`);
      if (igpu && String(igpu).toLowerCase() !== 'none') items.push(`iGPU: ${igpu}`);
      if (hasCooler === 'Yes' || hasCooler === true) items.push('✓ Có cooler kèm');
      else if (hasCooler === 'No' || hasCooler === false) items.push('⚠ Không kèm cooler');
      break;
    }
    case 'mainboard': {
      const socket = s['Socket / CPU'] ?? s['Socket'] ?? s['socket_cpu'];
      const ff = s['Form Factor'];
      const chipset = s['Chipset'];
      const memType = s['Memory Type'] ?? s['memory_type'];
      const memSlots = s['Memory Slots'] ?? s['memory_slots'];
      const m2raw = s['M.2 Slots'];
      const sata = s['SATA 6.0 Gb/s Ports'] ?? s['sata_ports'];
      if (socket) items.push(`Socket: ${socket}`);
      if (ff) items.push(ff);
      if (chipset) items.push(`Chipset: ${chipset}`);
      if (memType) items.push(memType);
      if (memSlots) items.push(`${memSlots} khe RAM`);
      if (m2raw) items.push(`${Array.isArray(m2raw) ? m2raw.length : 1} khe M.2`);
      if (sata) items.push(`SATA ×${String(sata).match(/\d+/)?.[0] ?? sata}`);
      break;
    }
    case 'ram': {
      const speed = s['Speed'] ?? s['speed'];
      const modules = s['Modules'] ?? s['modules'];
      const cas = s['CAS Latency'] ?? s['cas_latency'];
      if (speed) items.push(speed);
      if (modules) items.push(modules);
      if (cas) items.push(`CL${cas}`);
      break;
    }
    case 'harddrive': {
      const type = s['Type'] ?? s['type'];
      const cap = s['Capacity'] ?? s['capacity'];
      const ff = s['Form Factor'];
      const iface = s['Interface'];
      if (type) items.push(type);
      if (cap) items.push(typeof cap === 'number' ? `${cap} GB` : String(cap));
      if (ff) items.push(ff);
      if (iface) items.push(iface);
      break;
    }
    case 'gpu': {
      const mem = s['Memory'] ?? s['VRAM'];
      const memType = s['Memory Type'] ?? s['memory_type'];
      const tdp = s['TDP'];
      if (mem) items.push(`${mem}${memType ? ` ${memType}` : ''}`);
      if (tdp) items.push(`TDP: ${tdp}`);
      break;
    }
    case 'psu': {
      const watt = s['Wattage'];
      const eff = s['Efficiency Rating'];
      const ff = s['Form Factor'];
      const mod = s['Modular'];
      if (watt) items.push(`${watt}W`);
      if (eff) items.push(eff);
      if (ff) items.push(ff);
      if (mod) items.push(mod);
      break;
    }
    case 'case': {
      const type = s['Type'] ?? s['Form Factor'];
      const maxCooler = s['Maximum CPU Cooler Height'];
      if (type) items.push(type);
      if (maxCooler) items.push(`Max cooler: ${maxCooler}`);
      break;
    }
    case 'cooler': {
      const sockets = s['CPU Socket'];
      const height = s['Height'];
      const tdp = s['TDP'];
      if (sockets) {
        const list = Array.isArray(sockets) ? (sockets as string[]).slice(0, 4).join(', ') : String(sockets);
        items.push(list);
      }
      if (height) items.push(String(height));
      if (tdp) items.push(`TDP: ${tdp}`);
      break;
    }
  }
  return items.filter(Boolean);
}

// ─── Slot capacity helpers ────────────────────────────────────────────────────

function getRamCapacity(p: Product): { sticks: number; gb: number } {
  const m = (p.specs?.['Modules'] ?? p.specs?.modules ?? '').match(/^(\d+)\s*x\s*(\d+)\s*GB/i);
  if (m) return { sticks: parseInt(m[1]), gb: parseInt(m[1]) * parseInt(m[2]) };
  return { sticks: 2, gb: 0 };
}

function ramSlotStatus(mb: Product | null, items: (Product | null)[]): { used: number; total: number; gbUsed: number; gbMax: number } {
  const total = mb ? (parseInt(String(mb.specs?.['Memory Slots'] ?? '4'), 10) || 4) : 4;
  const gbMax = mb ? parseInt(String(mb.specs?.['Memory Max'] ?? '0').replace(/[^0-9]/g, '') || '0', 10) : 0;
  let used = 0; let gbUsed = 0;
  for (const p of items) {
    if (!p) continue;
    const c = getRamCapacity(p);
    used += c.sticks; gbUsed += c.gb;
  }
  return { used, total, gbUsed, gbMax };
}

function hddSlotStatus(mb: Product | null, items: (Product | null)[]): { m2Used: number; m2Total: number; sataUsed: number; sataTotal: number } {
  const m2Total = mb ? mbM2Slots(mb).length : 0;
  const sataTotal = mb ? mbSataPorts(mb) : 0;
  let m2Used = 0; let sataUsed = 0;
  for (const p of items) {
    if (!p) continue;
    const ff = p.specs?.['Form Factor'] ?? '';
    if (parseM2SizeFF(ff)) m2Used++;
    else if (ff.startsWith('2.5') || ff.startsWith('3.5')) sataUsed++;
  }
  return { m2Used, m2Total, sataUsed, sataTotal };
}

/** Returns a warning string if this extra item exceeds mainboard capacity */
function getExtraWarning(category: string, ep: Product, index: number, mb: Product | null, mainItem: Product | null, extras: Product[]): string | null {
  if (!mb) return null;
  const allItems: (Product | null)[] = [mainItem, ...extras];

  if (category === 'ram') {
    const stat = ramSlotStatus(mb, allItems.slice(0, index + 2)); // up to and including this extra
    if (stat.used > stat.total) return `Vượt ${stat.total} khe RAM`;
    if (stat.gbMax > 0 && stat.gbUsed > stat.gbMax) return `Vượt giới hạn ${stat.gbMax}GB`;
    const mbType = mb.specs?.['Memory Type'] ?? mb.specs?.memory_type ?? '';
    const speed = ep.specs?.['Speed'] ?? ep.specs?.speed ?? '';
    if (mbType && speed && !speed.toUpperCase().startsWith(mbType.toUpperCase()))
      return `RAM ${speed} ≠ ${mbType} của mainboard`;
  }

  if (category === 'harddrive') {
    const stat = hddSlotStatus(mb, allItems.slice(0, index + 2));
    const ff = ep.specs?.['Form Factor'] ?? '';
    const size = parseM2SizeFF(ff);
    if (size) {
      if (!m2SlotFits(size, mbM2Slots(mb))) return `Khe M.2-${size} không có trên mainboard`;
      if (stat.m2Used > stat.m2Total) return `Vượt ${stat.m2Total} khe M.2`;
    } else if (ff.startsWith('2.5') || ff.startsWith('3.5')) {
      if (stat.sataUsed > stat.sataTotal) return `Vượt ${stat.sataTotal} cổng SATA`;
    }
  }
  return null;
}

/** Max units the user can add for RAM / HDD given the mainboard */
function getMaxQuantity(category: string, product: Product, mb: Product | null): number {
  if (!mb) return 4;
  if (category === 'ram') {
    const slots   = parseInt(String(mb.specs?.['Memory Slots'] ?? '4'), 10) || 4;
    const memMax  = parseInt(String(mb.specs?.['Memory Max'] ?? '0').replace(/[^0-9]/g, '') || '0', 10);
    const modStr  = product.specs?.['Modules'] ?? product.specs?.modules ?? '';
    const m = modStr.match(/^(\d+)\s*x\s*(\d+)\s*GB/i);
    if (m) {
      const sticks = parseInt(m[1], 10);
      const gbKit  = sticks * parseInt(m[2], 10);
      const bySlots = Math.floor(slots / sticks);
      const byCap   = memMax > 0 ? Math.floor(memMax / gbKit) : 99;
      return Math.max(1, Math.min(bySlots, byCap));
    }
    return Math.max(1, Math.floor(slots / 2));
  }
  if (category === 'harddrive') {
    const ff   = product.specs?.['Form Factor'] ?? '';
    const size = parseM2SizeFF(ff);
    if (size) {
      const compatible = mbM2Slots(mb).filter((s) => s.replace(/[^0-9/]/g, '').split('/').includes(size));
      return Math.max(1, compatible.length);
    }
    if (ff.startsWith('2.5') || ff.startsWith('3.5')) return Math.max(1, mbSataPorts(mb));
  }
  return 1;
}

// ─── Validate full build (with quantities) ────────────────────────────────────

function validateBuild(components: Record<string, ComponentEntry | null>): string[] {
  const warnings: string[] = [];
  const cpu     = components['cpu']?.product ?? null;
  const mb      = components['mainboard']?.product ?? null;
  const ram     = components['ram'];
  const hdd     = components['harddrive'];
  const cooler  = components['cooler'];

  if (cpu && cooler) {
    const r = checkCompat(cooler.product, 'cooler', { cpu: { product: cpu } });
    if (!r.ok) warnings.push(r.reason!);
  }

  if (cpu && mb) {
    const r = checkCompat(cpu, 'cpu', { mainboard: mb ? { product: mb } : null });
    if (!r.ok) warnings.push(r.reason!);
  }
  if (mb && ram) {
    const r = checkCompat(ram.product, 'ram', { mainboard: mb ? { product: mb } : null });
    if (!r.ok) warnings.push(r.reason!);

    // Quantity checks
    const slots  = parseInt(String(mb.specs?.['Memory Slots'] ?? '4'), 10) || 4;
    const memMax = parseInt(String(mb.specs?.['Memory Max'] ?? '0').replace(/[^0-9]/g, '') || '0', 10);
    const modStr = ram.product.specs?.['Modules'] ?? '';
    const m = modStr.match(/^(\d+)\s*x\s*(\d+)\s*GB/i);
    if (m) {
      const sticks = parseInt(m[1], 10) * ram.quantity;
      const total  = parseInt(m[1], 10) * parseInt(m[2], 10) * ram.quantity;
      if (sticks > slots) warnings.push(`RAM: ${sticks} thanh vượt quá ${slots} khe của mainboard.`);
      if (memMax > 0 && total > memMax) warnings.push(`RAM: tổng ${total}GB vượt giới hạn ${memMax}GB của mainboard.`);
    }
  }
  if (mb && hdd) {
    const r = checkCompat(hdd.product, 'harddrive', { mainboard: mb ? { product: mb } : null });
    if (!r.ok) warnings.push(r.reason!);

    // M.2 slot quantity check
    const ff = hdd.product.specs?.['Form Factor'] ?? '';
    const size = parseM2SizeFF(ff);
    if (size) {
      const compat = mbM2Slots(mb).filter((s) => s.replace(/[^0-9/]/g, '').split('/').includes(size));
      if (hdd.quantity > compat.length) warnings.push(`SSD M.2-${size}: chỉ có ${compat.length} khe phù hợp, không thể gắn ${hdd.quantity} ổ.`);
    } else if (ff.startsWith('2.5') || ff.startsWith('3.5')) {
      if (hdd.quantity > mbSataPorts(mb)) warnings.push(`Ổ ${ff}: chỉ có ${mbSataPorts(mb)} cổng SATA, không thể gắn ${hdd.quantity} ổ.`);
    }
  }

  // PSU wattage vs estimated system TDP
  const psu = components['psu'];
  if (psu) {
    const { estimated, recommended } = calcSystemPower({
      cpu,
      gpu: components['gpu']?.product ?? null,
      mb,
      ramItems: [components['ram']?.product ?? null],
      hddItems: [components['harddrive']?.product ?? null],
      cooler: components['cooler']?.product ?? null,
    });
    const psuWatts = parseTDP(psu.product.specs?.['Wattage']) || 0;
    if (psuWatts > 0 && estimated > 0 && psuWatts < recommended) {
      warnings.push(`PSU ${psuWatts}W có thể không đủ — ước tính cần ~${recommended}W.`);
    }
  }

  return warnings;
}

// ─── Component selector modal ────────────────────────────────────────────────

function ComponentPicker({
  category, currentId, existing = {}, onSelect, onClose,
}: {
  category: string;
  currentId?: number;
  existing?: ExistingMap;
  onSelect: (p: Product) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, limit: '50' });
      if (query.trim()) params.set('search', query.trim());
      const res = await api.getProducts(params.toString());
      const withPrice = res.data.filter((p) => p.base_price > 0);
      const noPrice = res.data.filter((p) => !p.base_price || p.base_price <= 0);
      setResults([...withPrice, ...noPrice]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    const t = setTimeout(() => search(q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, search]);

  // Annotate with compat result, sort compatible first
  const annotated = results.map((p) => ({ p, compat: checkCompat(p, category, existing) }));
  const sorted = [...annotated].sort((a, b) => (a.compat.ok ? 0 : 1) - (b.compat.ok ? 0 : 1));
  const hasIncompat = sorted.some((x) => !x.compat.ok);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', width: '580px', maxWidth: '95vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Chọn {categoryLabels[category] ?? category}</h3>
            {hasIncompat && (
              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>⚠️ Sản phẩm không tương thích hiển thị ở cuối danh sách</div>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}><X size={16} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input className="input" style={{ paddingLeft: '32px' }} placeholder={`Tìm ${categoryLabels[category] ?? category}...`}
              value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Đang tải...</div>}
          {!loading && sorted.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Không tìm thấy</div>}

          {sorted.map(({ p, compat }) => {
            const isCurrent = p.id === currentId;
            return (
              <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  background: isCurrent ? 'rgba(99,102,241,0.08)' : 'transparent',
                  opacity: compat.ok ? 1 : 0.55,
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isCurrent ? 'rgba(99,102,241,0.08)' : 'transparent'; }}
              >
                <img src={p.image_url || 'https://placehold.co/40x40/1a1a2e/6366f1'} alt=""
                  style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-secondary)', padding: '4px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: compat.ok ? 'var(--color-text-muted)' : '#f59e0b' }}>
                    {compat.ok ? p.brand : `⚠️ ${compat.reason}`}
                  </div>
                </div>
                {p.base_price > 0 && (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{formatPrice(p.base_price)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Quantity control ─────────────────────────────────────────────────────────

function QtyControl({ qty, max, onChange }: { qty: number; max: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button onClick={() => onChange(Math.max(1, qty - 1))} disabled={qty <= 1}
        style={{ padding: '2px 7px', background: 'transparent', borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRight: '1px solid var(--color-border)', cursor: qty > 1 ? 'pointer' : 'default', color: qty > 1 ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1 }}>−</button>
      <span style={{ padding: '2px 8px', fontSize: '12px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>×{qty}</span>
      <button onClick={() => onChange(Math.min(max, qty + 1))} disabled={qty >= max}
        style={{ padding: '2px 7px', background: 'transparent', borderTop: 'none', borderBottom: 'none', borderLeft: '1px solid var(--color-border)', borderRight: 'none', cursor: qty < max ? 'pointer' : 'default', color: qty < max ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1 }}>+</button>
    </div>
  );
}

// ─── Build card (one suggested config) ───────────────────────────────────────

type EditSlot = BuildComponent & { quantity: number };

function BuildCard({
  build, token, isLoggedIn,
}: {
  build: BuildSuggestion & { alt_description?: string };
  token: string | null;
  isLoggedIn: boolean;
}) {
  const [editComponents, setEditComponents] = useState<Record<string, EditSlot>>(
    () => Object.fromEntries(Object.entries(build.components).map(([k, v]) => [k, { ...v, quantity: 1 }]))
  );
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [extras, setExtras] = useState<Record<string, Product[]>>({ ram: [], harddrive: [] });
  const [addingExtra, setAddingExtra] = useState<string | null>(null);
  const [buildName, setBuildName] = useState(build.label || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showWarnings, setShowWarnings] = useState(false);

  const mb = editComponents['mainboard']?.product ?? null;
  const existing: ExistingMap = Object.fromEntries(
    Object.entries(editComponents).map(([k, v]) => [k, { product: v.product }])
  );

  const totalPrice = Object.values(editComponents).reduce((s, c) => s + Number(c.product.base_price) * c.quantity, 0)
    + Object.values(extras).flat().reduce((s, p) => s + Number(p.base_price), 0);
  const withinBudget = totalPrice <= build.budget;
  const serverWarnings = build.compatibility_warnings ?? [];

  // Live compat check on user edits
  const liveWarnings: string[] = [];
  for (const [key, slot] of Object.entries(editComponents)) {
    const r = checkCompat(slot.product, key, existing);
    if (!r.ok) liveWarnings.push(r.reason!);
  }
  const allWarnings = [...new Set([...serverWarnings, ...liveWarnings])];

  const handleSave = async () => {
    if (!token) return;
    if (!buildName.trim()) { setSaveError('Nhập tên cấu hình'); return; }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const comps: Record<string, any> = {};
      for (const [k, c] of Object.entries(editComponents)) {
        comps[k] = { product_id: c.product.id, name: c.product.name, price: c.product.base_price, image_url: c.product.image_url, quantity: 1 };
      }
      for (const [cat, prods] of Object.entries(extras)) {
        prods.forEach((p, i) => {
          comps[`${cat}_${i + 2}`] = { product_id: p.id, name: p.name, price: p.base_price, image_url: p.image_url, quantity: 1 };
        });
      }
      await api.saveBuild({ name: buildName.trim(), components: comps, total_price: Math.round(totalPrice) }, token);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (e: any) { setSaveError(e.message || 'Lỗi khi lưu'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {build.alt_description && (
        <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <Info size={13} style={{ display: 'inline', marginRight: '6px', color: 'var(--color-primary)' }} />
          {build.alt_description}
        </div>
      )}

      {/* Compatibility warnings */}
      {allWarnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowWarnings(!showWarnings)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)',
            borderLeft: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)',
            borderBottom: showWarnings ? 'none' : '1px solid rgba(245,158,11,0.3)',
            borderRadius: showWarnings ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
            width: '100%', cursor: 'pointer', color: '#f59e0b', fontSize: '13px', fontWeight: 500,
          }}>
            <AlertTriangle size={14} />
            {allWarnings.length} cảnh báo tương thích
            {showWarnings ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
          </button>
          {showWarnings && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.04)', borderLeft: '1px solid rgba(245,158,11,0.2)', borderRight: '1px solid rgba(245,158,11,0.2)', borderBottom: '1px solid rgba(245,158,11,0.2)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
              {allWarnings.map((w, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '3px 0' }}>• {w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Component list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {COMPONENT_ORDER.filter((k) => editComponents[k]).map((key) => {
          const comp = editComponents[key];
          if (!comp) return null;
          const isMulti = key === 'ram' || key === 'harddrive';
          const extraList = extras[key] ?? [];
          return (
            <Fragment key={key}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                <img src={comp.product.image_url || 'https://placehold.co/48x48/1a1a2e/6366f1'} alt=""
                  style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-secondary)', padding: '4px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: `${RATIO_COLORS[key]}22`, color: RATIO_COLORS[key] ?? 'var(--color-primary)' }}>{key}</span>
                    {comp.over_budget && <span className="badge badge-warning" style={{ fontSize: '10px' }}>Vượt ngân sách</span>}
                  </div>
                  <Link href={`/products/${comp.product.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>
                    {comp.product.name}
                  </Link>
                  {(() => {
                    const details = getCompatDetails(key, comp.product);
                    if (key === 'psu') details.push(getPsuPowerTag({
                      cpu: editComponents['cpu']?.product ?? null,
                      gpu: editComponents['gpu']?.product ?? null,
                      mb: editComponents['mainboard']?.product ?? null,
                      ramItems: [editComponents['ram']?.product ?? null, ...(extras['ram'] ?? [])],
                      hddItems: [editComponents['harddrive']?.product ?? null, ...(extras['harddrive'] ?? [])],
                      cooler: editComponents['cooler']?.product ?? null,
                    }, comp.product));
                    return details.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                        {details.map((d, i) => (
                          <span key={i} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: d.startsWith('⚠') ? 'rgba(245,158,11,0.1)' : d.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'var(--color-bg)', border: `1px solid ${d.startsWith('⚠') ? 'rgba(245,158,11,0.35)' : d.startsWith('✓') ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`, color: d.startsWith('⚠') ? '#f59e0b' : d.startsWith('✓') ? '#10b981' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d}</span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                    {formatPrice(comp.product.base_price)}
                    {' · '}Ngân sách: {formatPrice(comp.budget_allocated)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap', fontSize: '14px' }}>
                    {formatPrice(Number(comp.product.base_price))}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isMulti && (() => {
                      let canAdd = true; let hint = '';
                      if (key === 'ram') {
                        const st = ramSlotStatus(mb, [comp.product, ...(extras['ram'] ?? [])]);
                        canAdd = st.used < st.total && (st.gbMax === 0 || st.gbUsed < st.gbMax);
                        hint = canAdd ? `${st.used}/${st.total} khe` : `Đã dùng hết ${st.total} khe RAM`;
                      } else if (key === 'harddrive') {
                        const st = hddSlotStatus(mb, [comp.product, ...(extras['harddrive'] ?? [])]);
                        canAdd = st.m2Used < st.m2Total || st.sataUsed < st.sataTotal;
                        hint = canAdd ? `M.2: ${st.m2Used}/${st.m2Total} · SATA: ${st.sataUsed}/${st.sataTotal}` : 'Đã hết khe M.2 và cổng SATA';
                      }
                      return (
                        <button onClick={() => canAdd && setAddingExtra(key)} disabled={!canAdd} title={hint}
                          className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', gap: '4px', opacity: canAdd ? 1 : 0.35, cursor: canAdd ? 'pointer' : 'not-allowed' }}>
                          <Plus size={11} /> Thêm
                        </button>
                      );
                    })()}
                    <button onClick={() => setPickerKey(key)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', gap: '4px' }}>
                      <RefreshCw size={11} /> Thay
                    </button>
                  </div>
                </div>
              </div>
              {extraList.map((ep, ei) => {
                const warn = getExtraWarning(key, ep, ei, mb, comp.product, extraList);
                return (
                  <div key={`extra-${ei}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', marginLeft: '20px', borderLeft: `3px solid ${warn ? '#f59e0b' : (RATIO_COLORS[key] ?? 'var(--color-primary)')}44` }}>
                    <img src={ep.image_url || 'https://placehold.co/40x40/1a1a2e/6366f1'} alt=""
                      style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-secondary)', padding: '4px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', color: warn ? '#f59e0b' : (RATIO_COLORS[key] ?? 'var(--color-text-muted)'), fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                        {warn ? `⚠️ ${warn}` : `+ ${categoryLabels[key] ?? key} bổ sung`}
                      </div>
                      <Link href={`/products/${ep.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>
                        {ep.name}
                      </Link>
                      {(() => {
                        const details = getCompatDetails(key, ep);
                        return details.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                            {details.map((d, i) => (
                              <span key={i} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: d.startsWith('⚠') ? 'rgba(245,158,11,0.1)' : d.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'var(--color-bg)', border: `1px solid ${d.startsWith('⚠') ? 'rgba(245,158,11,0.35)' : d.startsWith('✓') ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`, color: d.startsWith('⚠') ? '#f59e0b' : d.startsWith('✓') ? '#10b981' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d}</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {formatPrice(Number(ep.base_price))}
                      </span>
                      <button
                        onClick={() => setExtras((prev) => ({ ...prev, [key]: prev[key].filter((_, j) => j !== ei) }))}
                        className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-danger)' }}>
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {/* Total */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-elevated)', padding: '16px 20px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Tổng chi phí</div>
          <span className={`badge ${withinBudget ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
            {withinBudget ? '✅ Trong ngân sách' : '⚠️ Vượt ngân sách'}
          </span>
        </div>
        <span style={{ fontSize: '22px', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {formatPrice(totalPrice)}
        </span>
      </div>

      {/* Save */}
      {isLoggedIn ? (
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={13} /> Lưu cấu hình</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input className="input" placeholder="Đặt tên cấu hình..." value={buildName} onChange={(e) => setBuildName(e.target.value)} style={{ flex: 1 }} />
            <button onClick={handleSave} disabled={saving || saveSuccess} className={`btn btn-sm ${saveSuccess ? 'btn-secondary' : 'btn-primary'}`} style={{ whiteSpace: 'nowrap' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <><Check size={14} /> Đã lưu</> : <><Save size={14} /> Lưu</>}
            </button>
          </div>
          {saveError && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px' }}>{saveError}</p>}
          {saveSuccess && <p style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '6px' }}>✅ Đã lưu! Xem tại <Link href="/profile" style={{ color: 'var(--color-primary)' }}>trang cá nhân</Link>.</p>}
        </div>
      ) : (
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <Link href="/auth/login" style={{ color: 'var(--color-primary)' }}>Đăng nhập</Link> để lưu cấu hình.
        </div>
      )}

      {pickerKey && (
        <ComponentPicker
          category={pickerKey}
          currentId={editComponents[pickerKey]?.product?.id}
          existing={existing}
          onSelect={(p) => setEditComponents((prev) => ({
            ...prev,
            [pickerKey]: { product: p, budget_allocated: prev[pickerKey]?.budget_allocated ?? 0, over_budget: false, quantity: 1 },
          }))}
          onClose={() => setPickerKey(null)}
        />
      )}
      {addingExtra && (
        <ComponentPicker
          category={addingExtra}
          existing={existing}
          onSelect={(p) => {
            setExtras((prev) => ({ ...prev, [addingExtra]: [...(prev[addingExtra] ?? []), p] }));
            setAddingExtra(null);
          }}
          onClose={() => setAddingExtra(null)}
        />
      )}
    </div>
  );
}

// ─── Custom Build tab ─────────────────────────────────────────────────────────

function CustomBuildTab({ budget, token, isLoggedIn }: { budget: number; token: string | null; isLoggedIn: boolean }) {
  const [components, setComponents] = useState<Record<string, ComponentEntry | null>>({
    cpu: null, cooler: null, mainboard: null, ram: null, gpu: null, harddrive: null, psu: null, case: null,
  });
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [custExtras, setCustExtras] = useState<Record<string, Product[]>>({ ram: [], harddrive: [] });
  const [custAddingExtra, setCustAddingExtra] = useState<string | null>(null);
  const [buildName, setBuildName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const mb = components['mainboard']?.product ?? null;
  const existing: ExistingMap = Object.fromEntries(
    Object.entries(components).filter(([, v]) => v != null).map(([k, v]) => [k, { product: v!.product }])
  );

  const warnings = validateBuild(components);
  const totalPrice = Object.values(components).reduce((s, e) => s + (e ? Number(e.product.base_price) * e.quantity : 0), 0)
    + Object.values(custExtras).flat().reduce((s, p) => s + Number(p.base_price), 0);
  const withinBudget = totalPrice <= budget;

  const handleSave = async () => {
    if (!token) return;
    if (!buildName.trim()) { setSaveError('Nhập tên cấu hình'); return; }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const comps: Record<string, any> = {};
      for (const [k, e] of Object.entries(components)) {
        if (e) comps[k] = { product_id: e.product.id, name: e.product.name, price: e.product.base_price, image_url: e.product.image_url, quantity: 1 };
      }
      for (const [cat, prods] of Object.entries(custExtras)) {
        prods.forEach((p, i) => {
          comps[`${cat}_${i + 2}`] = { product_id: p.id, name: p.name, price: p.base_price, image_url: p.image_url, quantity: 1 };
        });
      }
      await api.saveBuild({ name: buildName.trim(), components: comps, total_price: Math.round(totalPrice) }, token);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (e: any) { setSaveError(e.message || 'Lỗi khi lưu'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <Info size={13} style={{ display: 'inline', marginRight: '6px', color: 'var(--color-primary)' }} />
        Tự chọn linh kiện — hệ thống sẽ kiểm tra tính tương thích tự động.
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Cảnh báo tương thích
          </div>
          {warnings.map((w, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '2px 0' }}>• {w}</div>)}
        </div>
      )}

      {/* Component slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {COMPONENT_ORDER.map((key) => {
          if (key === 'cooler' && !components['cpu']?.product) return null;
          const entry = components[key];
          const isMulti = key === 'ram' || key === 'harddrive';
          const extraList = custExtras[key] ?? [];
          return (
            <Fragment key={key}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                {entry ? (
                  <>
                    <img src={entry.product.image_url || 'https://placehold.co/48x48/1a1a2e/6366f1'} alt=""
                      style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-secondary)', padding: '4px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: `${RATIO_COLORS[key]}22`, color: RATIO_COLORS[key] ?? 'var(--color-primary)' }}>{key}</span>
                      <Link href={`/products/${entry.product.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{entry.product.name}</Link>
                      {(() => {
                        const details = getCompatDetails(key, entry.product);
                        if (key === 'psu') details.push(getPsuPowerTag({
                          cpu: components['cpu']?.product ?? null,
                          gpu: components['gpu']?.product ?? null,
                          mb: components['mainboard']?.product ?? null,
                          ramItems: [components['ram']?.product ?? null, ...(custExtras['ram'] ?? [])],
                          hddItems: [components['harddrive']?.product ?? null, ...(custExtras['harddrive'] ?? [])],
                          cooler: components['cooler']?.product ?? null,
                        }, entry.product));
                        return details.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                            {details.map((d, i) => (
                              <span key={i} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: d.startsWith('⚠') ? 'rgba(245,158,11,0.1)' : d.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'var(--color-bg)', border: `1px solid ${d.startsWith('⚠') ? 'rgba(245,158,11,0.35)' : d.startsWith('✓') ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`, color: d.startsWith('⚠') ? '#f59e0b' : d.startsWith('✓') ? '#10b981' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d}</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        {formatPrice(entry.product.base_price)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatPrice(Number(entry.product.base_price))}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isMulti && (() => {
                          let canAdd = true; let hint = '';
                          if (key === 'ram') {
                            const st = ramSlotStatus(mb, [entry.product, ...(custExtras['ram'] ?? [])]);
                            canAdd = st.used < st.total && (st.gbMax === 0 || st.gbUsed < st.gbMax);
                            hint = canAdd ? `${st.used}/${st.total} khe` : `Đã dùng hết ${st.total} khe RAM`;
                          } else if (key === 'harddrive') {
                            const st = hddSlotStatus(mb, [entry.product, ...(custExtras['harddrive'] ?? [])]);
                            canAdd = st.m2Used < st.m2Total || st.sataUsed < st.sataTotal;
                            hint = canAdd ? `M.2: ${st.m2Used}/${st.m2Total} · SATA: ${st.sataUsed}/${st.sataTotal}` : 'Đã hết khe M.2 và cổng SATA';
                          }
                          return (
                            <button onClick={() => canAdd && setCustAddingExtra(key)} disabled={!canAdd} title={hint}
                              className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', gap: '4px', opacity: canAdd ? 1 : 0.35, cursor: canAdd ? 'pointer' : 'not-allowed' }}>
                              <Plus size={11} /> Thêm
                            </button>
                          );
                        })()}
                        <button onClick={() => setPickerKey(key)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          <RefreshCw size={11} />
                        </button>
                        <button onClick={() => setComponents((p) => ({ ...p, [key]: null }))} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-danger)' }}>
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--color-bg-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{categoryLabels[key] ?? key} — chưa chọn</div>
                    </div>
                    <button onClick={() => setPickerKey(key)} className="btn btn-primary btn-sm" style={{ fontSize: '12px' }}>
                      <Plus size={13} /> Chọn
                    </button>
                  </>
                )}
              </div>
              {entry && extraList.map((ep, ei) => {
                const warn = getExtraWarning(key, ep, ei, mb, entry.product, extraList);
                return (
                  <div key={`extra-${ei}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', marginLeft: '20px', borderLeft: `3px solid ${warn ? '#f59e0b' : (RATIO_COLORS[key] ?? 'var(--color-primary)')}44` }}>
                    <img src={ep.image_url || 'https://placehold.co/40x40/1a1a2e/6366f1'} alt=""
                      style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-bg-secondary)', padding: '4px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', color: warn ? '#f59e0b' : (RATIO_COLORS[key] ?? 'var(--color-text-muted)'), fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                        {warn ? `⚠️ ${warn}` : `+ ${categoryLabels[key] ?? key} bổ sung`}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.name}</div>
                      {(() => {
                        const details = getCompatDetails(key, ep);
                        return details.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                            {details.map((d, i) => (
                              <span key={i} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: d.startsWith('⚠') ? 'rgba(245,158,11,0.1)' : d.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'var(--color-bg)', border: `1px solid ${d.startsWith('⚠') ? 'rgba(245,158,11,0.35)' : d.startsWith('✓') ? 'rgba(16,185,129,0.35)' : 'var(--color-border)'}`, color: d.startsWith('⚠') ? '#f59e0b' : d.startsWith('✓') ? '#10b981' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d}</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {formatPrice(Number(ep.base_price))}
                      </span>
                      <button
                        onClick={() => setCustExtras((prev) => ({ ...prev, [key]: prev[key].filter((_, j) => j !== ei) }))}
                        className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-danger)' }}>
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {/* Total */}
      {totalPrice > 0 && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-elevated)', padding: '16px 20px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Tổng ước tính</div>
            <span className={`badge ${withinBudget ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
              {withinBudget ? '✅ Trong ngân sách' : `⚠️ Vượt ${formatPrice(totalPrice - budget)}`}
            </span>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatPrice(totalPrice)}
          </span>
        </div>
      )}

      {/* Save */}
      {isLoggedIn && totalPrice > 0 ? (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input className="input" placeholder="Đặt tên cấu hình..." value={buildName}
              onChange={(e) => setBuildName(e.target.value)} style={{ flex: 1 }} />
            <button onClick={handleSave} disabled={saving || saveSuccess || warnings.length > 0}
              className={`btn btn-sm ${saveSuccess ? 'btn-secondary' : 'btn-primary'}`} style={{ whiteSpace: 'nowrap' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <><Check size={14} /> Đã lưu</> : <><Save size={14} /> Lưu</>}
            </button>
          </div>
          {warnings.length > 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Giải quyết các cảnh báo trước khi lưu.</p>}
          {saveError && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px' }}>{saveError}</p>}
          {saveSuccess && <p style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '6px' }}>✅ Đã lưu! Xem tại <Link href="/profile" style={{ color: 'var(--color-primary)' }}>trang cá nhân</Link>.</p>}
        </div>
      ) : !isLoggedIn && totalPrice > 0 ? (
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <Link href="/auth/login" style={{ color: 'var(--color-primary)' }}>Đăng nhập</Link> để lưu cấu hình.
        </div>
      ) : null}

      {pickerKey && (
        <ComponentPicker
          category={pickerKey}
          currentId={components[pickerKey]?.product?.id}
          existing={existing}
          onSelect={(p) => setComponents((prev) => {
            const next = { ...prev, [pickerKey]: { product: p, quantity: 1 } };
            if (pickerKey === 'cpu' && !cpuNeedsCooler(p)) next['cooler'] = null;
            return next;
          })}
          onClose={() => setPickerKey(null)}
        />
      )}
      {custAddingExtra && (
        <ComponentPicker
          category={custAddingExtra}
          existing={existing}
          onSelect={(p) => {
            setCustExtras((prev) => ({ ...prev, [custAddingExtra]: [...(prev[custAddingExtra] ?? []), p] }));
            setCustAddingExtra(null);
          }}
          onClose={() => setCustAddingExtra(null)}
        />
      )}
    </div>
  );
}

// ─── Ratio editor ─────────────────────────────────────────────────────────────

function RatioEditor({
  ratios,
  budget,
  onChange,
  onReset,
}: {
  ratios: Record<string, number>;
  budget: number;
  onChange: (key: string, val: number) => void;
  onReset: () => void;
}) {
  const [mode, setMode] = useState<'ratio' | 'price'>('ratio');
  const keys = COMPONENT_ORDER.filter((k) => k in ratios);
  const total = Object.values(ratios).reduce((s, v) => s + v, 0);
  const totalPrice = Object.values(ratios).reduce((s, v) => s + v * budget, 0);

  // Price mode: local draft prices (string for free-form editing)
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, String(Math.round((ratios[k] ?? 0) * budget))]))
  );

  // Sync draft prices when switching to price mode or when ratios/budget change externally
  const syncDraft = () => {
    setDraftPrices(Object.fromEntries(keys.map((k) => [k, String(Math.round((ratios[k] ?? 0) * budget))])));
  };

  const handleModeToggle = (next: 'ratio' | 'price') => {
    if (next === 'price') syncDraft();
    setMode(next);
  };

  const handlePriceChange = (key: string, raw: string) => {
    setDraftPrices((p) => ({ ...p, [key]: raw }));
    const val = parseInt(raw.replace(/[^0-9]/g, '') || '0', 10);
    if (budget > 0) onChange(key, val / budget);
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px', background: 'var(--color-bg)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)', fontSize: '12px',
  };

  return (
    <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Điều chỉnh tỉ lệ ngân sách</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {(['ratio', 'price'] as const).map((m) => (
              <button key={m} onClick={() => handleModeToggle(m)}
                style={{
                  padding: '4px 10px', fontSize: '11px', fontWeight: mode === m ? 600 : 400,
                  background: mode === m ? 'var(--color-primary)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--color-text-muted)',
                  borderTop: 'none', borderBottom: 'none',
                  borderLeft: m === 'price' ? '1px solid var(--color-border)' : 'none',
                  borderRight: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {m === 'ratio' ? '% Tỉ lệ' : '₫ Giá tiền'}
              </button>
            ))}
          </div>
          {/* Total indicator */}
          {mode === 'ratio' ? (
            <span style={{ fontSize: '12px', color: Math.abs(total - 1) > 0.005 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              Tổng: {(total * 100).toFixed(0)}% {Math.abs(total - 1) > 0.005 ? '⚠️' : '✅'}
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: Math.abs(totalPrice - budget) / budget > 0.01 ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {totalPrice.toLocaleString('vi-VN')}₫ {Math.abs(totalPrice - budget) / budget > 0.01 ? '⚠️' : '✅'}
            </span>
          )}
          <button onClick={() => { onReset(); syncDraft(); }} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>Đặt lại</button>
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {keys.map((key) => {
          const pct = Math.round((ratios[key] ?? 0) * 100);
          const label = <span style={{ width: '80px', fontSize: '12px', color: RATIO_COLORS[key] ?? 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }}>{key}</span>;

          if (mode === 'ratio') {
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {label}
                <input type="range" min={0} max={60} step={1} value={pct}
                  onChange={(e) => onChange(key, parseInt(e.target.value, 10) / 100)}
                  style={{ flex: 1, accentColor: RATIO_COLORS[key] ?? 'var(--color-primary)' }} />
                <input type="number" min={0} max={60} value={pct}
                  onChange={(e) => onChange(key, parseInt(e.target.value || '0', 10) / 100)}
                  style={{ ...inputStyle, width: '52px', textAlign: 'center' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '14px' }}>%</span>
              </div>
            );
          }

          // Price mode
          const priceVal = Math.round((ratios[key] ?? 0) * budget);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {label}
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(priceVal / budget * 100, 100)}%`, height: '100%', background: RATIO_COLORS[key] ?? 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.2s' }} />
                </div>
              </div>
              <input
                type="text"
                value={draftPrices[key] ?? ''}
                onChange={(e) => handlePriceChange(key, e.target.value)}
                onBlur={(e) => {
                  const clean = parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10);
                  setDraftPrices((p) => ({ ...p, [key]: String(clean) }));
                }}
                style={{ ...inputStyle, width: '110px', textAlign: 'right' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '14px' }}>₫</span>
            </div>
          );
        })}
      </div>

      {/* Price mode helper */}
      {mode === 'price' && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Ngân sách: <strong>{budget.toLocaleString('vi-VN')}₫</strong> — nhập giá cho từng linh kiện, tỉ lệ sẽ tự tính.
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BuildPage() {
  const { token, isLoggedIn } = useAuth();
  const [budget, setBudget] = useState(20_000_000);
  const [customBudget, setCustomBudget] = useState('');
  const [purpose, setPurpose] = useState('gaming');
  const [result, setResult] = useState<BuildSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showRatioEditor, setShowRatioEditor] = useState(false);
  const [customRatios, setCustomRatios] = useState<Record<string, number> | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [resultGeneration, setResultGeneration] = useState(0);

  const finalBudget = customBudget ? parseInt(customBudget) : budget;

  // Default ratios for current purpose
  const DEFAULT_RATIOS_BY_PURPOSE: Record<string, Record<string, number>> = {
    gaming:      { cpu: 0.20, gpu: 0.35, ram: 0.08, harddrive: 0.08, mainboard: 0.12, psu: 0.08, case: 0.09 },
    workstation: { cpu: 0.30, gpu: 0.25, ram: 0.12, harddrive: 0.10, mainboard: 0.10, psu: 0.06, case: 0.07 },
    office:      { cpu: 0.25, gpu: 0.10, ram: 0.15, harddrive: 0.15, mainboard: 0.15, psu: 0.10, case: 0.10 },
    streaming:   { cpu: 0.25, gpu: 0.30, ram: 0.10, harddrive: 0.10, mainboard: 0.10, psu: 0.08, case: 0.07 },
  };
  const defaultRatios: Record<string, number> = DEFAULT_RATIOS_BY_PURPOSE[purpose] ?? {};

  const activeRatios = customRatios ?? defaultRatios;

  const handleSuggest = async () => {
    if (finalBudget < 5_000_000) { setError('Ngân sách tối thiểu 5,000,000 VND'); return; }
    const ratioTotal = Object.values(activeRatios).reduce((s, v) => s + v, 0);
    if (customRatios && Math.abs(ratioTotal - 1) > 0.01) { setError(`Tổng tỉ lệ phải bằng 100% (hiện tại ${(ratioTotal * 100).toFixed(0)}%)`); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.suggestBuild(finalBudget, purpose, customRatios ?? undefined);
      setResult(res);
      setActiveTab(0);
      setResultGeneration((n) => n + 1);
    } catch (e: any) { setError(e.message || 'Không thể gợi ý cấu hình'); }
    finally { setLoading(false); }
  };

  const tabs = result
    ? [
        { label: `🎯 ${result.label || 'Cấu hình chính'}`, build: result },
        ...(result.alternatives ?? []).map((alt, i) => ({ label: `⚡ ${alt.label || `Phương án ${i + 1}`}`, build: alt as BuildSuggestion & { alt_description?: string } })),
        { label: '🔧 Tự tạo', build: null },
      ]
    : [{ label: '🔧 Tự tạo', build: null }];

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: '960px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Wrench size={28} /> Build PC Wizard
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
        Chọn ngân sách và mục đích — hệ thống gợi ý cấu hình tối ưu, có thể chỉnh sửa và lưu lại.
      </p>

      {/* Purpose Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Mục đích sử dụng</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {PURPOSES.map((p) => (
            <button key={p.key} onClick={() => { setPurpose(p.key); setCustomRatios(null); }}
              className="card card-interactive"
              style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', border: purpose === p.key ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: purpose === p.key ? 'rgba(99,102,241,0.06)' : undefined }}>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '3px' }}>{p.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget ratio explanation */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '14px 16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={13} /> Phân bổ ngân sách — {PURPOSES.find((p) => p.key === purpose)?.label}
            </div>
            <button onClick={() => setShowRatioEditor(!showRatioEditor)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px', gap: '4px' }}>
              <Edit2 size={11} /> {showRatioEditor ? 'Ẩn' : 'Tùy chỉnh'}
              {showRatioEditor ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>

          {/* Visual ratio bar */}
          <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
            {COMPONENT_ORDER.filter((k) => k in activeRatios).map((key) => (
              <div key={key} style={{ width: `${(activeRatios[key] ?? 0) * 100}%`, background: RATIO_COLORS[key] ?? '#64748b', transition: 'width 0.3s' }} title={`${key}: ${((activeRatios[key] ?? 0) * 100).toFixed(0)}%`} />
            ))}
          </div>

          {/* Labels */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {COMPONENT_ORDER.filter((k) => k in activeRatios).map((key) => (
              <span key={key} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '99px', background: `${RATIO_COLORS[key]}22`, color: RATIO_COLORS[key] ?? 'var(--color-text-muted)' }}>
                {key} {((activeRatios[key] ?? 0) * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        {showRatioEditor && (
          <div style={{ marginTop: '10px' }}>
            <RatioEditor
              ratios={activeRatios}
              budget={finalBudget}
              onChange={(key, val) => setCustomRatios((prev) => ({ ...(prev ?? activeRatios), [key]: val }))}
              onReset={() => setCustomRatios(null)}
            />
          </div>
        )}
      </div>

      {/* Budget Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
          <DollarSign size={16} style={{ display: 'inline' }} /> Ngân sách
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {BUDGETS.map((b) => (
            <button key={b} onClick={() => { setBudget(b); setCustomBudget(''); }}
              className={`btn btn-sm ${budget === b && !customBudget ? 'btn-primary' : 'btn-secondary'}`}>
              {formatPrice(b)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="number" className="input" placeholder="Ngân sách tùy chỉnh..."
            value={customBudget} onChange={(e) => setCustomBudget(e.target.value)} style={{ maxWidth: '260px' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>VND</span>
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

      <button onClick={handleSuggest} disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: '32px' }}>
        {loading ? <><Loader2 size={18} className="animate-spin" /> Đang tính toán...</> : <><Wrench size={18} /> Gợi ý cấu hình</>}
      </button>

      {/* ─── Results / Custom Build ──────────────────────────────────────── */}
      <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px', overflowX: 'auto' }}>
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                padding: '10px 16px', fontSize: '13px', fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: activeTab === i ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-1px',
                transition: 'all 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tabs[activeTab]?.build ? (
            <BuildCard key={`${resultGeneration}-${activeTab}`} build={tabs[activeTab].build as BuildSuggestion & { alt_description?: string }} token={token} isLoggedIn={isLoggedIn} />
          ) : (
            <CustomBuildTab budget={finalBudget} token={token} isLoggedIn={isLoggedIn} />
          )}
        </div>
    </div>
  );
}
