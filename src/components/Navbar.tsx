'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search, Menu, X, Cpu, BarChart3, Wrench, User, LogOut, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/providers';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/products', label: 'Linh kiện', icon: <Cpu size={16} /> },
    { href: '/compare', label: 'So sánh', icon: <BarChart3 size={16} /> },
    { href: '/build', label: 'Build PC', icon: <Wrench size={16} /> },
    { href: '/benchmark', label: 'Benchmark', icon: <Trophy size={16} /> },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: '64px', gap: '24px' }}>
        {/* Logo */}
        <Link href="/" style={{
          fontSize: '20px',
          fontWeight: 700,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          ⚡ PCParts
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} style={{
          flex: 1,
          maxWidth: '480px',
          display: 'flex',
          position: 'relative',
        }} className="hidden-mobile">
          <input
            type="text"
            placeholder="Tìm kiếm linh kiện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: '40px', borderRadius: '999px' }}
          />
          <Search size={16} style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
          }} />
        </form>

        {/* Navigation - Desktop */}
        <nav style={{ display: 'flex', gap: '4px' }} className="hidden-mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 500,
                color: pathname.startsWith(link.href) ? 'var(--color-primary-hover)' : 'var(--color-text-secondary)',
                background: pathname.startsWith(link.href) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }} className="hidden-mobile">
          {isLoggedIn ? (
            <>
              {user?.role === 'admin' && (
                <Link href="/admin" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>
                  Admin
                </Link>
              )}
              <Link href="/profile" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                <User size={16} />
                {user?.username}
              </Link>
              <button onClick={logout} className="btn btn-ghost btn-sm">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                Đăng nhập
              </Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-ghost show-mobile"
          style={{ marginLeft: 'auto', padding: '8px' }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="show-mobile" style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px',
                borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}>
                {link.icon}{link.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', fontSize: '14px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <LogOut size={16} />Đăng xuất
              </button>
            ) : (
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '8px' }}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
