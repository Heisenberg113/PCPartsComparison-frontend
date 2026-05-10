import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { QueryProvider, AuthProvider, CompareProvider } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PCParts - So sánh linh kiện máy tính",
  description: "Tra cứu, so sánh thông số kỹ thuật và giá linh kiện phần cứng máy tính từ các shop Việt Nam.",
  keywords: "linh kiện, máy tính, CPU, GPU, RAM, HARDDRIVE, so sánh, giá, Phong Vũ, GearVN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AuthProvider>
            <CompareProvider>
              <Navbar />
              <main style={{ flex: 1 }}>{children}</main>
              <footer style={{
                borderTop: '1px solid var(--color-border)',
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '13px',
              }}>
                <div className="container">
                  © 2026 PCParts — So sánh linh kiện máy tính Việt Nam
                </div>
              </footer>
            </CompareProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
