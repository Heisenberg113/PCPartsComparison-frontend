'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{
        background: '#0a0a0f',
        color: '#f1f1f5',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        margin: 0,
      }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
            😕 Đã xảy ra lỗi
          </h2>
          <p style={{ color: '#9898b0', marginBottom: '24px', fontSize: '14px' }}>
            {error.message || 'Ứng dụng gặp sự cố không mong muốn.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
