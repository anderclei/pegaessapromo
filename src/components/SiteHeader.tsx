'use client';

import Link from 'next/link';

export default function SiteHeader() {
  return (
    <div className="header-wrapper-fixed">
      <div className="header-top-bar">
        <div className="top-bar-container">
          <span></span>
          <div className="top-bar-links">
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="header-container">
          <div className="header-left-placeholder"></div>

          <Link href="/" className="site-logo" title="Pega Essa Promo! - Sua vitrine de ofertas">
            <img src="/logo.png" alt="Pega Essa Promo! - Logotipo Oficial" />
          </Link>

          <div className="header-right-group">
            <div className="header-search">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
            </div>
          </div>
        </div>
        
        {/* Navegação Rápida de Categorias no Header */}
        <nav className="header-categories-bar" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          padding: '8px 16px',
          background: '#111827',
          borderTop: '1px solid #1f2937',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <Link href="/" style={{ color: '#ff4444', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.85rem', padding: '4px 12px', background: 'rgba(255,68,68,0.1)', borderRadius: '20px' }}>
            🛠️ Ferramentas & Construção
          </Link>
          <Link href="/?category=eletronicos" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', padding: '4px 12px' }}>
            📱 Eletrônicos
          </Link>
          <Link href="/?category=eletrodomesticos" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', padding: '4px 12px' }}>
            🍳 Eletrodomésticos
          </Link>
          <Link href="/?category=informatica" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', padding: '4px 12px' }}>
            💻 Informática
          </Link>
        </nav>
      </header>
    </div>
  );
}
