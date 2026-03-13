'use client';

import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-container">
        <nav className="header-nav-left">
          <a href="#">🎫 CUPOM</a>
          <a href="#">🔥 PROMOÇÕES DO DIA</a>
        </nav>

        <Link href="/" className="site-logo">
          <img src="/logo.png" alt="Pega Essa Promo!" />
        </Link>

        <div className="header-right-group">
          <nav className="header-nav-right">
            <a href="#">📦 CATEGORIAS</a>
            <a href="#">📝 BLOG</a>
          </nav>
          <div className="header-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
          </div>
        </div>
      </div>
    </header>
  );
}
