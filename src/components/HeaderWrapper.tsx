'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from './SiteHeader';

export default function HeaderWrapper() {
  const pathname = usePathname();
  
  // Cabeçalho de Admin
  if (pathname === '/admin') {
    return (
      <header style={{ background: '#000', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="Pega Essa Promo!" style={{ height: '32px' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>PAINEL ADMIN</h1>
        </div>
        <Link href="/" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>
          👁️ Ver Loja Pública
        </Link>
      </header>
    );
  }

  // Cabeçalho Público (Home e outras páginas)
  return <SiteHeader />;
}
