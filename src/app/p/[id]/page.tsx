import { Metadata } from 'next';
import { getPromotion, getLatestPromotions } from '@/lib/promotions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Promotion } from '@/lib/types';
import ProductCarousel from '@/components/ProductCarousel';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getPromotion(id);
  
  if (!promotion) {
    return { title: 'Promoção não encontrada' };
  }

  const { product } = promotion;
  
  return {
    title: `🔥 OFERTA: ${product.title}`,
    description: `Aproveite esta oferta incrível por apenas ${product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}!`,
    openGraph: {
      title: product.title,
      description: `📦 +${product.sales.toLocaleString('pt-BR')} vendidos | ⭐ ${product.rating.toFixed(1)}`,
      images: [{ url: product.image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: `Oferta imperdível: ${product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      images: [product.image],
    },
  };
}

const ProductCardSm = ({ promotion }: { promotion: Promotion }) => {
  const { product, id } = promotion;
  const storeLabel = product.platform === 'amazon' ? 'Amazon' : 
                   product.platform === 'shopee' ? 'Shopee' : 
                   product.platform === 'mercadolivre' ? 'Mercado Livre' : 
                   product.platform === 'aliexpress' ? 'AliExpress' : 'Loja';

  const getLogo = (platform: string) => {
    switch (platform) {
      case 'amazon': return '/logos/amazon.jpg';
      case 'shopee': return '/logos/shopee.jpg';
      case 'mercadolivre': return '/logos/mercadolivre.png';
      case 'aliexpress': return '/logos/mercadolivre.png'; // Fallback as we don't have AE logo yet
      default: return '/logos/amazon.jpg';
    }
  };

  return (
    <Link href={`/p/${id}`} className="card-related">
      <div className="card-image-container">
        <img src={product.image} alt={product.title} />
        {product.discount && <span className="card-discount-badge">-{product.discount}%</span>}
        <div className="card-store-circle-sm">
           <img src={getLogo(product.platform)} alt={storeLabel} />
        </div>
      </div>
      <div className="card-content">
        <div className="card-meta">há 3h</div>
        <h3 className="card-title">{product.title}</h3>
        <div className="card-price-row">
           <span className="card-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"></path></svg>
        </div>
      </div>
    </Link>
  );
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const promotion = await getPromotion(id);

  if (!promotion) {
    notFound();
  }

  const latestPromotions = await getLatestPromotions(12);
  const { product, affiliateLink } = promotion;

  const getStoreDetails = (platform: string) => {
    switch (platform) {
      case 'amazon': return { label: 'Amazon', logo: '/logos/amazon.jpg' };
      case 'shopee': return { label: 'Shopee', logo: '/logos/shopee.jpg' };
      case 'mercadolivre': return { label: 'Mercado Livre', logo: '/logos/mercadolivre.png' };
      case 'magalu': return { label: 'Magalu', logo: '/logos/magalu.jpg' };
      case 'aliexpress': return { label: 'AliExpress', logo: '/logos/mercadolivre.png' };
      default: return { label: 'Loja', logo: '/logos/amazon.jpg' };
    }
  };

  const store = getStoreDetails(product.platform);
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="landing-wrapper">
      <main className="content-area">
        <div className="main-grid-container">
          {/* Main Product Card */}
          <section className="product-showcase">
             <div className="showcase-header">
                <div className="store-info">
                   <div className="store-logo-circle">
                      <img src={store.logo} alt={store.label} />
                   </div>
                   <span>Promoção da loja: <strong>{store.label}</strong></span>
                </div>
             </div>

             <div className="product-main-content">
                <div className="image-box">
                   <img src={product.image} alt={product.title} />
                </div>
                <div className="product-details">
                   <div className="info-meta">
                      <span className="time-since">há 3h</span>
                      <span className="hashtag">#parceria</span>
                   </div>
                   <h1 className="main-title">{product.title}</h1>
                   
                   <div className="pricing-box">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="old-price">R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                      <div className="new-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      {discount && (
                        <span className="discount-pct">({discount}% de desconto)</span>
                      )}
                   </div>

                   <a href={affiliateLink} target="_blank" className="btn-buy-now">
                      Comprar na Amazon
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"></path></svg>
                   </a>
                   <p className="price-disclaimer">*Preço e disponibilidade sujeito a alteração a qualquer momento.</p>
                </div>
             </div>
          </section>

          {/* Social Join Box */}
          <section className="social-join-box">
             <h3>Já está no nosso grupo de promoções?</h3>
             <p>É Grátis! Receba no WhatsApp as melhores promoções e economize mais.</p>
             <a href="#" className="btn-whatsapp">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 256 256"><path d="M187.58,144.84c-3.11-1.55-18.44-9.08-21.29-10.12s-4.93-1.55-7,1.55-8.1,10.12-9.93,12.19-3.62,2.33-6.73.78a84.7,84.7,0,0,1-25.37-15.65A93.47,93.47,0,0,1,100,113.1c-1.81-3.11-.19-4.8,1.36-6.34q2.34-2.31,4.67-5.44a17.3,17.3,0,0,0,3.11-5.18,5.7,5.7,0,0,0-.26-5.44c-.78-1.55-7-16.85-9.6-23.07s-5.08-5.22-7-5.32c-1.8-.1-3.89-.1-6-.1a11.45,11.45,0,0,0-8.3,3.89C69,74.5,60,82.79,60,99.36s12.1,32.41,13.82,34.75,23.59,36,57.14,50.47c8,3.44,14.22,5.49,19.08,7a45.72,45.72,0,0,0,21,1.31c6.51-1,18.44-7.52,21-14.78s2.6-13.48,1.81-14.78-2.85-2-6-3.55ZM128,24a104,104,0,0,0-91.82,152.88L24.71,215.12a8,8,0,0,0,9.17,9.17l38.24-11.47A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.89-12.28,8,8,0,0,0-6.1-.75L49.19,211.5l8.53-27.81a8,8,0,0,0-1-6.73,88,88,0,1,1,159.24-41A88,88,0,0,1,77.01,136l-.01.01a88,88,0,0,1,51,80Z"></path></svg>
                Clique aqui para entrar
             </a>
          </section>



          {/* Related Sections */}
          <section className="more-sections">
            <h2 className="section-title">Você também vai gostar</h2>
            <ProductCarousel promotions={latestPromotions} />

            <h2 className="section-title">Veja mais promoções do dia</h2>
            <div className="promo-grid">
               {latestPromotions.slice(0, 8).map(p => <ProductCardSm key={p.id} promotion={p} />)}
            </div>

            <div className="see-all-container">
               <Link href="/" className="btn-see-all">Ver todas as promoções do dia</Link>
            </div>
          </section>
        </div>
      </main>

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
         </div>
      </footer>
    </div>
  );
}
