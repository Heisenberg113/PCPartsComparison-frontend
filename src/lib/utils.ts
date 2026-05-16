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
  harddrive: 'HARDDRIVE - Ổ cứng',
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
  harddrive: '💿',
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

const SPEC_TRANSLATIONS: Record<string, string> = {
  // Chung
  'Manufacturer': 'Nhà sản xuất',
  'Part #': 'Mã sản phẩm',
  'Series': 'Series',
  'Color': 'Màu sắc',
  'Interface': 'Giao diện',
  'Form Factor': 'Form Factor',
  'Length': 'Chiều dài',
  'Height': 'Chiều cao',
  'Dimensions': 'Kích thước',

  // CPU
  'Socket': 'Socket',
  'TDP': 'TDP',
  'L2 Cache': 'Cache L2',
  'L3 Cache': 'Cache L3',
  'Packaging': 'Đóng gói',
  'Core Count': 'Số nhân',
  'Core Family': 'Dòng nhân',
  'ECC Support': 'Hỗ trợ ECC',
  'Lithography': 'Tiến trình',
  'Thread Count': 'Số luồng',
  'Includes Cooler': 'Kèm tản nhiệt',
  'Microarchitecture': 'Vi kiến trúc',
  'Includes CPU Cooler': 'Kèm CPU cooler',
  'Integrated Graphics': 'Đồ họa tích hợp',
  'Base Clock': 'Xung cơ bản',
  'Boost Clock': 'Xung boost',
  'Performance Core Clock': 'Xung P-core',
  'Efficient Core Clock': 'Xung E-core',

  // GPU
  'Chipset': 'Chipset',
  'Memory': 'Bộ nhớ',
  'Memory Type': 'Loại bộ nhớ',
  'Core Clock': 'Xung nhân',
  'Effective Memory Clock': 'Xung nhớ hiệu dụng',
  'HDMI Outputs': 'Cổng HDMI',
  'DisplayPort Outputs': 'Cổng DisplayPort',
  'Cooling': 'Tản nhiệt',
  'External Power': 'Nguồn ngoài',
  'Multi-Monitor Support': 'Hỗ trợ đa màn hình',
  'SLI/CrossFire': 'SLI / CrossFire',
  'Frame Sync': 'Đồng bộ khung hình',

  // RAM
  'Speed': 'Tốc độ',
  'Modules': 'Số thanh × dung lượng',
  'First Word Latency': 'Độ trễ',
  'CAS Latency': 'CAS Latency',
  'Voltage': 'Điện áp',
  'Timing': 'Timing',
  'ECC / Registered': 'ECC / Registered',
  'Heat Spreader': 'Tản nhiệt RAM',
  'Price / GB': 'Giá / GB',
  'On-Die ECC': 'On-Die ECC',

  // PSU
  'Type': 'Loại',
  'Wattage': 'Công suất',
  'Modular': 'Dạng module',
  'Efficiency Rating': 'Chứng nhận hiệu suất',
  'Fanless': 'Không quạt',
  'ATX 24-Pin Connectors': 'Đầu ATX 24-pin',
  'EPS 8-Pin Connectors': 'Đầu EPS 8-pin',
  'PCIe 12-Pin Connectors': 'Đầu PCIe 12-pin',
  'PCIe 12+4-Pin Connectors': 'Đầu PCIe 12+4-pin',
  'PCIe 8-Pin Connectors': 'Đầu PCIe 8-pin',
  'PCIe 6-Pin Connectors': 'Đầu PCIe 6-pin',
  'SATA Connectors': 'Đầu SATA',
  'Molex 4-Pin Connectors': 'Đầu Molex 4-pin',

  // Mainboard
  'Socket / CPU': 'Socket CPU',
  'Chipset': 'Chipset',
  'Memory Max': 'RAM tối đa',
  'Memory Slots': 'Khe RAM',
  'Memory Speed': 'Tốc độ RAM',
  'PCIe x16 Slots': 'Khe PCIe x16',
  'PCIe x8 Slots': 'Khe PCIe x8',
  'PCIe x4 Slots': 'Khe PCIe x4',
  'PCIe x1 Slots': 'Khe PCIe x1',
  'M.2 Slots': 'Khe M.2',
  'SATA 6.0 Gb/s': 'Cổng SATA 6 Gb/s',
  'USB 2.0 Headers': 'Header USB 2.0',
  'USB 3.2 Gen 1 Headers': 'Header USB 3.2 Gen1',
  'USB 3.2 Gen 2 Headers': 'Header USB 3.2 Gen2',
  'USB 3.2 Gen 2x2 Header': 'Header USB 3.2 Gen2×2',
  'Wireless Networking': 'Wi-Fi / Bluetooth',
  'RAID Support': 'Hỗ trợ RAID',
  'Uses Back-Connect Cables': 'Cáp back-connect',

  // Storage
  'Capacity': 'Dung lượng',
  'Cache': 'Bộ nhớ Cache',
  'NAND Flash Type': 'Loại NAND',
  'NVMe': 'NVMe',
  'Sequential Read': 'Đọc tuần tự',
  'Sequential Write': 'Ghi tuần tự',
  'RPM': 'Tốc độ quay',

  // Case
  'Includes Power Supply': 'Kèm nguồn',
  'Side Panel': 'Mặt bên',
  'Power Supply Shroud': 'Che PSU',
  'Front Panel USB': 'USB mặt trước',
  'Motherboard Form Factor': 'Form Factor mainboard',
  'Maximum Video Card Length': 'GPU tối đa',
  'Drive Bays': 'Khoang ổ đĩa',
  'Expansion Slots': 'Khe mở rộng',

  // Cooler
  'Fan RPM': 'Tốc độ quạt',
  'Noise Level': 'Độ ồn',
  'CPU Socket': 'Socket CPU',
  'Water Cooled': 'Tản nhiệt nước',
  'CFM': 'Lưu lượng khí (CFM)',
  'Radiator Size': 'Kích thước radiator',
  'Bearing Type': 'Loại vòng bi',
  'Static Pressure': 'Áp suất tĩnh',
  'PWM': 'Điều tốc PWM',
};

export function translateSpec(key: string): string {
  return SPEC_TRANSLATIONS[key] ?? key.replace(/_/g, ' ');
}
