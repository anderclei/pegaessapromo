'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, Promotion } from '@/lib/types';
import ProductCarousel from '@/components/ProductCarousel';

const getStoreLogo = (platform: string) => {
  switch (platform) {
    case 'amazon': return '/logos/amazon.jpg';
    case 'shopee': return '/logos/shopee.jpg';
    case 'mercadolivre': return '/logos/mercadolivre.png';
    default: return '/logos/amazon.jpg';
  }
};

const ProductCardPublic = ({ product, id }: { product: Product; id?: string }) => {
  const storeLogo = getStoreLogo(product.platform);
  // If id exists, it's a promotion (has a bridge page). If not, we could link to amazon directly.
  // For the storefront, we prefer linking to the bridge page for branding.
  const href = id ? `/p/${id}` : '#'; 

  return (
    <Link href={href} className="premium-card">
      <div className="premium-card-image">
        <img src={product.image} alt={product.title} />
        {product.discount && <div className="discount-badge">-{product.discount}%</div>}
        <div className="card-store-circle-sm" style={{ top: '10px', left: '10px', position: 'absolute', width: '28px', height: '28px' }}>
           <img src={storeLogo} alt={product.platform} />
        </div>
      </div>
      <div className="premium-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#999', marginBottom: '4px' }}>
           <span>📦 {product.sales.toLocaleString('pt-BR')}+ vendidos</span>
        </div>
        <h3 className="premium-card-title">{product.title}</h3>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
           <span className="premium-card-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           {product.originalPrice && product.originalPrice > product.price && (
             <span style={{ fontSize: '0.8rem', color: '#999', textDecoration: 'line-through' }}>
                R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </span>
           )}
        </div>
        <div className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', padding: '8px', textAlign: 'center' }}>
           Ver Detalhes
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromos() {
      try {
        // Fetch promotions (this uses getLatestPromotions via a mock or internal API if we had one)
        // For now, let's fetch from our local promotions list
        const res = await fetch('/api/promotions');
        const data = await res.json();
        setPromotions(data);
      } catch (error) {
        console.error('Failed to fetch promotions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPromos();
  }, []);

  return (
    <div className="landing-wrapper">
      <div className="catalogue-container">
        {/* Carousel Section */}
        {promotions.length > 0 && (
          <section className="featured-section" style={{ marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.5rem', fontSize: '1.8rem', fontWeight: 800 }}>⭐ Destaques Imperdíveis</h2>
            <ProductCarousel promotions={promotions} />
          </section>
        )}

        {/* Catalog Section */}
        <section className="dashboard-grid">
          <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
             <div>
                <h2 className="section-title" style={{ color: '#333', fontSize: '1.5rem' }}>🎸 Catálogo de Instrumentos</h2>
                <p className="section-subtitle" style={{ color: '#666' }}>O melhor da música com os melhores preços</p>
             </div>
             <div className="filter-count" style={{ fontSize: '0.9rem', color: '#999' }}>
                {promotions.length} produtos encontrados
             </div>
          </div>

          {loading ? (
            <div className="loading-container" style={{ padding: '4rem 0' }}>
              <div className="spinner" />
              <div className="loading-text" style={{ color: '#666' }}>Carregando catálogo...</div>
            </div>
          ) : promotions.length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem 0', background: 'white', borderRadius: '1rem', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ color: '#666' }}>Nenhum produto no catálogo no momento.</p>
              <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>Novas promoções são adicionadas diariamente!</p>
            </div>
          ) : (
            <div className="products-grid" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1.5rem' 
            }}>
              {promotions.map((promo) => (
                <ProductCardPublic key={promo.id} product={promo.product} id={promo.id} />
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="site-footer">
         <div className="footer-top">
            <span className="footer-label">Siga nas redes sociais:</span>
            <div className="social-links">
               <a href="#"><img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" width="30" alt="Instagram" /></a>
               <a href="#"><img src="https://img.icons8.com/ios-filled/50/ffffff/telegram-app.png" width="30" alt="Telegram" /></a>
               <a href="#"><img src="https://img.icons8.com/ios-filled/50/ffffff/tiktok.png" width="30" alt="TikTok" /></a>
            </div>
         </div>
         <div className="footer-badges">
            <div className="security-badge">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#22c55e" viewBox="0 0 256 256"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-80,80a20,20,0,1,1,20-20A20,20,0,0,1,128,160ZM96,56a32,32,0,0,1,64,0V80H96Z"></path></svg>
               <div className="badge-text">
                  <strong>SITE PROTEGIDO</strong>
                  <span>CERTIFICADO SSL</span>
               </div>
            </div>
            <div className="security-badge">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#22c55e" viewBox="0 0 256 256"><path d="M208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,160H48V56H208V200Zm-40-64H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Z"></path></svg>
               <div className="badge-text">
                  <strong>GOOGLE</strong>
                  <span>SAFE BROWSING</span>
               </div>
            </div>
         </div>
         <div className="footer-bottom">
            <span>Powered by <strong>Pega Essa Promo!</strong></span>
            <Link href="/admin" className="footer-admin-link" style={{ marginLeft: '1rem', color: '#999', textDecoration: 'none' }}>⚙️ Área Restrita (Admin)</Link>
         </div>
      </footer>
    </div>
  );
}
