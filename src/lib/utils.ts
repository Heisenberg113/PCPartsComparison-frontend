export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const categoryLabels: Record<string, string> = {
  cpu: 'CPU - Bộ vi xử lý',
  gpu: 'VGA - Card màn hình',
  ram: 'RAM - Bộ nhớ trong',
  ssd: 'SSD - Ổ cứng',
  hdd: 'HDD - Ổ cứng',
  mainboard: 'Mainboard - Bo mạch chủ',
  psu: 'PSU - Nguồn máy tính',
  case: 'Case - Vỏ máy tính',
  cooler: 'Tản nhiệt',
  monitor: 'Màn hình',
  'case-fan': 'Quạt tản nhiệt',
  keyboard: 'Bàn phím',
  mouse: 'Chuột',
  headphones: 'Tai nghe',
  speakers: 'Loa',
  'external-hard-drive': 'Ổ cứng di động',
};

export const categoryIcons: Record<string, string> = {
  cpu: '🔲',
  gpu: '🎮',
  ram: '💾',
  ssd: '💿',
  hdd: '💿',
  mainboard: '🔧',
  psu: '⚡',
  case: '🖥️',
  cooler: '❄️',
  monitor: '🖵',
  'case-fan': '🌀',
  keyboard: '⌨️',
  mouse: '🖱️',
  headphones: '🎧',
  speakers: '🔊',
  'external-hard-drive': '📁',
};

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
