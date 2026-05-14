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
  created_at: string;
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

export interface BuildSuggestion {
  purpose: string;
  budget: number;
  total_price: number;
  within_budget: boolean;
  components: Record<string, { product: Product; budget_allocated: number; over_budget?: boolean }>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; username: string; role: string };
}

// =================== API Functions ===================

export const api = {
  // Products
  getProducts: (params?: string) =>
    fetchAPI<ProductsResponse>(`/products${params ? `?${params}` : ''}`),

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
  suggestBuild: (budget: number, purpose?: string) =>
    fetchAPI<BuildSuggestion>('/builds/suggest', {
      method: 'POST',
      body: JSON.stringify({ budget, purpose }),
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
};

