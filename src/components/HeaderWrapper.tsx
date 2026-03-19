'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from './SiteHeader';

export default function HeaderWrapper() {
  const pathname = usePathname();
  
  // Cabeçalho de Admin
  if (pathname === '/admin') {
    return (
      <header className="header" style={{ position: 'fixed', width: '100%', top: 0, background: '#000', borderBottom: '1px solid #222', zIndex: 1000 }}>
        <div className="header-inner" style={{ background: 'transparent' }}>
          <Link href="/" className="logo">
            <img src="/logo.png" alt="Pega Essa Promo!" className="logo-image" style={{ height: '36px' }} />
            <div style={{ marginLeft: '1rem', borderLeft: '1px solid #333', paddingLeft: '1rem' }}>
               <h1 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '1px', color: '#fff' }}>PAINEL <span style={{ color: 'var(--accent-orange)' }}>ADMIN</span></h1>
            </div>
          </Link>
          <div className="header-nav">
             <Link href="/" className="nav-link" style={{ color: '#94a3b8' }}>
               👁️ Ver Site Público
             </Link>
             <div className="nav-link active" style={{ color: '#fff', fontWeight: 'bold' }}>
               🔐 Área Restrita
             </div>
          </div>
        </div>
      </header>
    );
  }

  // Cabeçalho Público (Home e outras páginas)
  return <SiteHeader />;
}
