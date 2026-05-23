const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type FetchOptions = RequestInit & {
  token?: string;
};

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// =================== Products ===================
export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  brand: string;
  specs: Record<string, any>;
  image_url: string;
  description: string;
  base_price: number;
  min_price: number | null;
  avg_rating: number;
  review_count: number;
  ext_rating: number | null;
  ext_review_count: number | null;
  benchmark_score: number | null;
  created_at: string;
}

export function combinedRating(product: Product): { avg: number; count: number } {
  const internalAvg = Number(product.avg_rating) || 0;
  const internalCount = Number(product.review_count) || 0;
  const externalAvg = product.ext_rating != null ? Number(product.ext_rating) : null;
  const externalCount = product.ext_review_count != null ? Number(product.ext_review_count) : null;

  const hasInternal = internalCount > 0;
  const hasExternal = externalAvg != null && externalCount != null && externalCount > 0;

  if (hasInternal && hasExternal) {
    const totalCount = internalCount + externalCount!;
    const weightedAvg = (internalAvg * internalCount + externalAvg! * externalCount!) / totalCount;
    return { avg: weightedAvg, count: totalCount };
  }
  if (hasInternal) return { avg: internalAvg, count: internalCount };
  if (hasExternal) return { avg: externalAvg!, count: externalCount! };
  return { avg: 0, count: 0 };
}

export interface ProductsResponse {
  data: Product[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface PriceEntry {
  shop_name: string;
  price: number;
  url: string;
  in_stock: boolean;
  updated_at: string;
}

export interface PriceHistory {
  product_id: number;
  history: Record<string, { date: string; price: number }[]>;
}

export interface Review {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: { id: number; username: string } | null;
}

// Review as returned by GET /reviews/user — includes product relation
export interface UserReview extends Review {
  product: { id: number; name: string; category: string; base_price: number };
}

export interface ReviewsResponse {
  data: Review[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface BuildConfig {
  id: number;
  name: string;
  components: Record<string, any>;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface BuildComponent {
  product: Product;
  budget_allocated: number;
  over_budget?: boolean;
}

export interface BuildSuggestion {
  purpose: string;
  budget: number;
  label: string;
  total_price: number;
  within_budget: boolean;
  compatibility_warnings?: string[];
  budget_ratios?: Record<string, number>;
  ratio_explanation?: {
    label: string;
    description: string;
    components: Record<string, string>;
  };
  components: Record<string, BuildComponent>;
  alternatives?: (Omit<BuildSuggestion, 'alternatives' | 'ratio_explanation'> & { alt_description: string })[];
}

export interface BudgetRatiosResponse {
  presets: Record<string, Record<string, number>>;
  alternatives: Record<string, { ratios: Record<string, number>; label: string; description: string }[]>;
  explanations: Record<string, { label: string; description: string; components: Record<string, string> }>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; username: string; role: string };
}

// =================== Admin Types ===================

export interface AdminStats {
  totals: { products: number; users: number; reviews: number; prices: number };
  categoryStats: { category: string; count: string }[];
  recentProducts: Pick<Product, 'id' | 'name' | 'category' | 'brand' | 'created_at'>[];
  recentReviews: {
    id: number;
    rating: number;
    content: string;
    created_at: string;
    user: { id: number; username: string } | null;
    product: { id: number; name: string } | null;
  }[];
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

export interface AdminReview {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  user: { id: number; username: string } | null;
  product: { id: number; name: string } | null;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface AdminReviewsResponse {
  data: AdminReview[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

// =================== API Functions ===================

export const api = {
  // Products
  getProducts: (params?: string, signal?: AbortSignal) =>
    fetchAPI<ProductsResponse>(`/products${params ? `?${params}` : ''}`, { signal }),

  getProduct: (id: number) =>
    fetchAPI<Product>(`/products/${id}`),

  getProductBySlug: (slug: string) =>
    fetchAPI<Product>(`/products/slug/${slug}`),

  compareProducts: (ids: number[]) =>
    fetchAPI<Product[]>('/products/compare', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  getCategories: () =>
    fetchAPI<{ category: string; count: string }[]>('/products/categories'),

  getBrands: (category?: string) =>
    fetchAPI<{ brand: string }[]>(`/products/brands${category ? `?category=${category}` : ''}`),

  // Prices
  getCurrentPrices: (productId: number) =>
    fetchAPI<PriceEntry[]>(`/products/${productId}/prices`),

  getPriceHistory: (productId: number, days?: number) =>
    fetchAPI<PriceHistory>(`/products/${productId}/prices/history${days ? `?days=${days}` : ''}`),

  // Reviews
  getReviews: (productId: number, page?: number) =>
    fetchAPI<ReviewsResponse>(`/reviews/product/${productId}?page=${page || 1}`),

  createReview: (data: { product_id: number; rating: number; content: string }, token: string) =>
    fetchAPI<Review>('/reviews', { method: 'POST', body: JSON.stringify(data), token }),

  updateReview: (reviewId: number, data: { rating: number; content: string }, token: string) =>
    fetchAPI<Review>(`/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(data), token }),

  deleteReview: (reviewId: number, token: string) =>
    fetchAPI<{ message: string }>(`/reviews/${reviewId}`, { method: 'DELETE', token }),

  getUserReviews: (token: string) =>
    fetchAPI<UserReview[]>('/reviews/user', { token }),

  // Search
  search: (q: string) =>
    fetchAPI<{ data: Product[]; total: number }>(`/search?q=${encodeURIComponent(q)}`),

  autocomplete: (q: string) =>
    fetchAPI<Product[]>(`/search/autocomplete?q=${encodeURIComponent(q)}`),

  // Build
  getBuildRatios: () =>
    fetchAPI<BudgetRatiosResponse>('/builds/ratios'),

  suggestBuild: (budget: number, purpose?: string, custom_ratios?: Record<string, number>) =>
    fetchAPI<BuildSuggestion>('/builds/suggest', {
      method: 'POST',
      body: JSON.stringify({ budget, purpose, custom_ratios }),
    }),

  saveBuild: (data: { name: string; components: Record<string, any>; total_price: number }, token: string) =>
    fetchAPI<BuildConfig>('/builds', { method: 'POST', body: JSON.stringify(data), token }),

  getUserBuilds: (token: string) =>
    fetchAPI<BuildConfig[]>('/builds', { token }),

  updateBuild: (buildId: number, data: { name?: string; components?: Record<string, any>; total_price?: number }, token: string) =>
    fetchAPI<BuildConfig>(`/builds/${buildId}`, { method: 'PUT', body: JSON.stringify(data), token }),

  deleteBuild: (buildId: number, token: string) =>
    fetchAPI<{ message: string }>(`/builds/${buildId}`, { method: 'DELETE', token }),

  // Auth
  register: (data: { email: string; username: string; password: string }) =>
    fetchAPI<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchAPI<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: (token: string) =>
    fetchAPI<{ id: number; email: string; username: string; role: string }>('/auth/profile', { token }),

  // Admin
  adminGetStats: (token: string) =>
    fetchAPI<AdminStats>('/admin/stats', { token }),

  adminGetUsers: (token: string, params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return fetchAPI<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ''}`, { token });
  },

  adminSetUserRole: (token: string, userId: number, role: string) =>
    fetchAPI<AdminUser>(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }), token }),

  adminDeleteUser: (token: string, userId: number) =>
    fetchAPI<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE', token }),

  adminGetReviews: (token: string, params?: { page?: number; limit?: number; product_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.product_id) q.set('product_id', String(params.product_id));
    const qs = q.toString();
    return fetchAPI<AdminReviewsResponse>(`/admin/reviews${qs ? `?${qs}` : ''}`, { token });
  },

  adminDeleteReview: (token: string, reviewId: number) =>
    fetchAPI<{ message: string }>(`/admin/reviews/${reviewId}`, { method: 'DELETE', token }),

  adminCreateProduct: (token: string, data: {
    name: string; category: string; brand: string;
    specs?: Record<string, unknown>; image_url?: string;
    description?: string; base_price?: number;
  }) =>
    fetchAPI<Product>('/products', { method: 'POST', body: JSON.stringify(data), token }),

  adminUpdateProduct: (token: string, id: number, data: Partial<{
    name: string; category: string; brand: string;
    specs: Record<string, unknown>; image_url: string;
    description: string; base_price: number;
  }>) =>
    fetchAPI<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),

  adminDeleteProduct: (token: string, id: number) =>
    fetchAPI<{ message: string }>(`/products/${id}`, { method: 'DELETE', token }),

  adminGetCrawlStatus: (token: string) =>
    fetchAPI<{
      isCrawling: boolean;
      logs: string[];
      recentlyCrawled: { id: number; name: string; category: string; brand: string; last_crawled: string; shop_count: number; min_price: number }[];
    }>('/crawler/status', { token }),

  adminStopCrawl: (token: string) =>
    fetchAPI<{ message: string }>('/crawler/stop', { method: 'POST', token }),

  adminGetProductsWithoutPrices: (token: string) =>
    fetchAPI<{ id: number; name: string; category: string; brand: string }[]>('/crawler/products-without-prices', { token }),

  adminCrawlMissingPrices: (token: string) =>
    fetchAPI<unknown[]>('/crawler/missing-prices', { method: 'POST', token }),

  adminCrawlAll: (token: string) =>
    fetchAPI<unknown[]>('/crawler/all', { method: 'POST', token }),

  adminCrawlOne: (token: string, productId: number) =>
    fetchAPI<unknown>(`/crawler/product/${productId}`, { method: 'POST', token }),

  adminCrawlRange: (token: string, from?: number, to?: number) => {
    const q = new URLSearchParams();
    if (from != null) q.set('from', String(from));
    if (to != null) q.set('to', String(to));
    const qs = q.toString();
    return fetchAPI<unknown[]>(`/crawler/range${qs ? `?${qs}` : ''}`, { method: 'POST', token });
  },
};

