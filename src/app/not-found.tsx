import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '32px',
    }}>
      <h1 style={{ fontSize: '72px', fontWeight: 800, margin: 0, opacity: 0.2 }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Trang không tồn tại</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Đường dẫn bạn truy cập không tồn tại hoặc đã bị xóa.
      </p>
      <Link href="/" style={{
        display: 'inline-flex',
        padding: '12px 24px',
        background: 'var(--gradient-primary)',
        color: 'white',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '14px',
      }}>
        Về trang chủ
      </Link>
    </div>
  );
}
