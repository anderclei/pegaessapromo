'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Product, Promotion, Coupon } from '@/lib/types';
import ProductCarousel from '@/components/ProductCarousel';
import './home.css';

const getStoreLogo = (platform: string) => {
  switch (platform) {
    case 'amazon': return '/logos/amazon.jpg';
    case 'shopee': return '/logos/shopee.jpg';
    case 'mercadolivre': return '/logos/mercadolivre.png';
    case 'magalu': return '/logos/magalu.jpg';
    default: return '/logos/amazon.jpg';
  }
};

const extractAsin = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/(dp|gp\/product|product)\/([A-Z0-9]{10})/);
  return match ? match[2] : null;
};

const normalizeUrl = (url: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Para URLs de busca ou específicas que precisam de query params, mantemos a query
    if (u.pathname.includes('/search') || u.pathname.includes('/busca')) {
      return u.origin + u.pathname + u.search;
    }
    const asin = extractAsin(url);
    if (asin) return `amazon:${asin}`;
    return u.origin + u.pathname;
  } catch {
    return url;
  }
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getRealDiscount = (p: Product): number => {
  if (p.discount && p.discount > 0) return p.discount;
  if (p.originalPrice && p.originalPrice > p.price) {
    return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  }
  return 0; // No fake discount - 0 means no real data available
};

const ProductCardPublic = ({ product, id }: { product: Product; id?: string | null }) => {
  const storeLogo = getStoreLogo(product.platform);
  const extractPlatformId = (url?: string) => {
    if (!url) return null;
    // Amazon ASIN
    const amazonMatch = url.match(/\/(dp|gp\/product|product)\/([A-Z0-9]{10})/i);
    if (amazonMatch) return amazonMatch[2];
    
    // Mercado Livre MLB
    const mlMatch = url.match(/\/(MLB-?\d+)/i);
    if (mlMatch) return mlMatch[1].replace('-', '');
    
    return null;
  };

  const extractedId = extractPlatformId(product.url);
  const finalId = id && id !== 'null' ? id : extractedId;
  const href = product.url || '#'; 
  
  // Only show real discount/original price from scraper data
  const discount = getRealDiscount(product);
  const originalPrice = (product.originalPrice && product.originalPrice > product.price)
    ? product.originalPrice
    : null; // null = don't show "De:" row

  return (
    <a href={href} target="_blank" className="premium-card" rel="noopener noreferrer">
      <div className="premium-card-image">
        <img src={product.image} alt={product.title} />
        {discount > 0 && <div className="discount-badge">-{discount}% OFF</div>}
        <div className="card-store-circle-sm">
           <img src={storeLogo} alt={product.platform} />
        </div>
      </div>
      <div className="premium-card-body">
         <div className="card-meta-row">
            <div className="product-rating">
               <span>★</span>
               <span>{(product.rating || 0).toFixed(1)}</span>
            </div>
            <span className="product-sales">+{(product.sales || 0).toLocaleString('pt-BR')} vendidos</span>
         </div>
        <h3 className="premium-card-title">{product.title}</h3>
        <div className="card-price-container">
           {originalPrice && (
             <div className="card-price-row old">
                <span className="price-label">De:</span>
                <span className="premium-card-old-price">
                   R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
             </div>
           )}
           <div className="card-price-row current">
              <span className="price-label">Por:</span>
              <span className="premium-card-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
        </div>
        <div className="btn btn-primary card-cta">
           Ir para Loja
        </div>
      </div>
    </a>
  );
};

const DEFAULT_CATEGORIES = [
  { id: 'ferramentas', label: 'Ferramentas & Construção' },
  { id: 'eletronicos', label: 'Eletrônicos' },
  { id: 'eletrodomesticos', label: 'Eletrodomésticos' },
  { id: 'informatica', label: 'Informática' },
];

export default function Home() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando promoções...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const queryCategory = searchParams.get('category');
  
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string, label: string }[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(queryCategory || 'ferramentas');

  // Atualizar quando a URL mudar
  useEffect(() => {
    if (queryCategory && queryCategory !== selectedCategory) {
      setSelectedCategory(queryCategory);
    }
  }, [queryCategory]);

  useEffect(() => {
    async function fetchData() {
      try {
        let activeCategory = selectedCategory;

        // Fetch categories first if not loaded
        if (categories.length === 0) {
          const catRes = await fetch('/api/categories');
          const catData = await catRes.json();
          setCategories(catData);
          if (catData.length > 0 && !activeCategory) {
            activeCategory = catData[0].id;
            setSelectedCategory(activeCategory);
            return; // let the re-render run the fetch with the new category
          }
        }

        if (!activeCategory) return;

        setLoading(true);
        const [promosRes, amazonRes, mlRes, shopeeRes, magaluRes] = await Promise.all([
          fetch('/api/promotions'),
          fetch(`/api/amazon?category=${activeCategory}`),
          fetch(`/api/mercadolivre?category=${activeCategory}`),
          fetch(`/api/shopee?category=${activeCategory}`),
          fetch(`/api/magalu?category=${activeCategory}`),
        ]);
        
        const promosData = await promosRes.json();
        const amazonData = await amazonRes.json();
        const mlData = await mlRes.json();
        const shopeeData = await shopeeRes.json();
        const magaluData = await magaluRes.json();
        
        const now = new Date();
        const mapToPromo = (list: any[], source: string) => (list || []).map((p: any, index: number) => ({
          id: p.id || null,
          product: { 
            ...p, 
            category: activeCategory, // Garante que o produto pertence à categoria buscada
            platform: p.platform || source,
            // Mantém listType do scraper (Amazon define corretamente), mas NÃO força 'bestsellers' como default
            listType: p.listType || (p.type === 'lightning' ? 'lightning' : undefined),
            // NUNCA inventar dados — usar exatamente o que vem da API
            rating: p.rating || 0,
            sales: p.sales || 0,
          },
          isHot: true,
          createdAt: p.createdAt || new Date(now.getTime() - index * 1000).toISOString()
        }));

        const amazonHot = mapToPromo(amazonData.products, 'amazon');

        // Distribui ML entre TODAS as seções (round-robin forçado)
        const mlSections = ['bestsellers', 'movers-and-shakers', 'most-wished-for', 'new-releases'];
        const mlHot = mapToPromo(mlData.products, 'mercadolivre').map((p, i) => ({
          ...p,
          product: {
            ...p.product,
            listType: mlSections[i % mlSections.length]
          }
        }));

        // Distribui Shopee entre TODAS as seções (round-robin forçado, offset diferente)
        const shopeeSections = ['movers-and-shakers', 'bestsellers', 'most-wished-for', 'new-releases'];
        const shopeeHot = mapToPromo(shopeeData.products, 'shopee').map((p, i) => ({
          ...p,
          product: {
            ...p.product,
            listType: shopeeSections[i % shopeeSections.length]
          }
        }));

        // Distribui Magalu entre TODAS as seções (round-robin forçado, offset 2)
        const magaluSections = ['most-wished-for', 'new-releases', 'bestsellers', 'movers-and-shakers'];
        const magaluHot = mapToPromo(magaluData.products, 'magalu').map((p, i) => ({
          ...p,
          product: {
            ...p.product,
            listType: magaluSections[i % magaluSections.length]
          }
        }));

        console.log(`[Frontend] Amazon: ${amazonHot.length}, ML: ${mlHot.length}, Shopee: ${shopeeHot.length}, Magalu: ${magaluHot.length}`);

        // Algoritmo de Mistura Equilibrada (intercala todas as fontes)
        const balanced: any[] = [];
        const maxLen = Math.max(amazonHot.length, mlHot.length, shopeeHot.length, magaluHot.length);
        
        for (let i = 0; i < maxLen; i++) {
          if (magaluHot[i]) balanced.push(magaluHot[i]);
          if (shopeeHot[i]) balanced.push(shopeeHot[i]);
          if (mlHot[i]) balanced.push(mlHot[i]);
          if (amazonHot[i]) balanced.push(amazonHot[i]);
        }

        // Promos manuais por último para não dominar as seções automáticas
        const combined = [...balanced, ...promosData];

        setPromotions(combined);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // Refresh every 1 minute
    
    return () => clearInterval(interval);
  }, [selectedCategory]);

  const allPromos = promotions
    .filter(p => p.product.price > 0)
    .filter(p => {
      if (selectedCategory && selectedCategory !== 'todos') {
        return p.product.category === selectedCategory;
      }
      return true;
    });

  // Logic to fill sections to required counts ensures UNIQUENESS
  const usedUrls = new Set<string>();

  const getUniqueDeals = (deals: Promotion[], limit: number, allowReuse: boolean = false) => {
    const unique = [];
    for (const deal of deals) {
      const url = normalizeUrl(deal.product.url);
      if (!url || (!allowReuse && usedUrls.has(url))) continue;
      
      unique.push(deal);
      usedUrls.add(url);
      if (unique.length === limit) break;
    }
    
    // Fallback if we didn't reach limit but allowReuse is false
    if (unique.length < limit && !allowReuse) {
       for (const deal of deals) {
         const url = normalizeUrl(deal.product.url);
         if (!url || unique.some(u => normalizeUrl(u.product.url) === url)) continue;
         unique.push(deal);
         if (unique.length === limit) break;
       }
    }
    
    return unique;
  };

  // Sections Filtering
  const getListDeals = (listType: string, limit: number) => {
    const deals = allPromos.filter(p => p.product.listType === listType || (listType === 'bestsellers' && !p.product.listType));
    return getUniqueDeals(deals, limit);
  };

  const lightningDeals = getUniqueDeals(allPromos.filter(p => p.product.category === 'relampago' || p.product.type === 'lightning'), 4);
  const top10 = getListDeals('bestsellers', 15);
  const newReleases = getListDeals('new-releases', 4);
  const moversAndShakers = getListDeals('movers-and-shakers', 8);
  const mostWishedFor = getListDeals('most-wished-for', 8);

  const potentialSuper = [
    ...allPromos.filter(p => p.product.category === 'ofertas' || p.product.type === 'super'),
    ...allPromos.filter(p => (p.product.discount || 0) >= 20),
  ];
  
  const superDealsRaw = getUniqueDeals(potentialSuper, 8);
  const superDeals = [...superDealsRaw].sort((a, b) => getRealDiscount(b.product) - getRealDiscount(a.product));

  return (
    <div className="home-container">
      <div className="home-content">
        
        {/* Barra de Seleção de Categorias */}
        {categories.length > 0 && (
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.id === 'ferramentas' && '🛠️ '}
                {cat.id === 'eletronicos' && '📱 '}
                {cat.id === 'eletrodomesticos' && '🍳 '}
                {cat.id === 'informatica' && '💻 '}
                {cat.label}
              </button>
            ))}
          </div>
        )}
        {moversAndShakers.length > 0 && (
          <section className="section-standard">
            <div className="section-header-compact">
              <span className="section-icon">📈</span>
              <h2>Produtos em Alta</h2>
            </div>
            <div className="products-grid-mini">
              {moversAndShakers.map((promo, idx) => (
                <ProductCardPublic key={`movers-${idx}`} product={promo.product} id={promo.id} />
              ))}
            </div>
          </section>
        )}

        {top10.length > 0 && (
          <section className="section-carousel">
            <div className="section-header-compact">
               <span className="section-icon">🔥</span>
               <h2>Mais Vendidos</h2>
            </div>
            <ProductCarousel promotions={top10} />
          </section>
        )}

        {mostWishedFor.length > 0 && (
          <section className="section-standard">
            <div className="section-header-compact">
              <span className="section-icon">🎁</span>
              <h2>Mais Desejados</h2>
            </div>
            <div className="products-grid-mini">
              {mostWishedFor.map((promo, idx) => (
                <ProductCardPublic key={`wished-${idx}`} product={promo.product} id={promo.id} />
              ))}
            </div>
          </section>
        )}

        {newReleases.length > 0 && (
          <section className="section-standard">
            <div className="section-header-compact">
              <span className="section-icon">🆕</span>
              <h2>Novidades de Hoje</h2>
            </div>
            <div className="products-grid-mini">
              {newReleases.map((promo, idx) => (
                <ProductCardPublic key={`new-${idx}`} product={promo.product} id={promo.id} />
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="compact-footer">
          <div className="footer-container">
             <div className="footer-left">
                <span className="copyright">© 2024 <strong>Pega Essa Promo!</strong></span>
             </div>

             <div className="footer-center">
                <div className="footer-badges-minimal">
                   <div className="badge-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#22c55e" viewBox="0 0 256 256"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-80,80a20,20,0,1,1,20-20A20,20,0,0,1,128,160ZM96,56a32,32,0,0,1,64,0V80H96Z"></path></svg>
                      <span>SSL SEGURO</span>
                   </div>
                   <div className="badge-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#22c55e" viewBox="0 0 256 256"><path d="M208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,160H48V56H208V200Zm-40-64H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Z"></path></svg>
                      <span>GOOGLE SAFE</span>
                   </div>
                </div>
             </div>

             <div className="footer-right">
                <div className="social-minimal">
                   <a href="#" aria-label="Instagram">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM172,36H84A48.05,48.05,0,0,0,36,84v88a48.05,48.05,0,0,0,48,48h88a48.05,48.05,0,0,0,48-48V84A48.05,48.05,0,0,0,172,36Zm32,136c0,17.65-14.35,32-32,32H84c-17.65,0-32-14.35-32-32V84C52,66.35,66.35,52,84,52h88c17.65,0,32,14.35,32,32ZM192,72a12,12,0,1,1-12-12A12,12,0,0,1,192,72Z"></path></svg>
                   </a>
                   <a href="#" aria-label="Telegram">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M236.88,26.19a9,9,0,0,0-9.16-1.57L25.06,103.93a12.72,12.72,0,0,0,2,24l34.89,11.53,16.29,52.76a12,12,0,0,0,23,0l12-39,39,12a12,12,0,0,0,0,23l-52.76,16.29,11.53,34.89a12.72,12.72,0,0,0,24,2l79.31-202.66A9,9,0,0,0,236.88,26.19ZM163,163.06,128.59,128l74-74a4,4,0,0,1,5.66,5.66Z"></path></svg>
                   </a>
                   <a href="#" aria-label="TikTok">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M232,102c0,33.14-26.86,60-60,60a59.78,59.78,0,0,1-36-12v42a68,68,0,1,1-68-68,8,8,0,0,1,0,16,52,52,0,1,0,52,52V40a8,8,0,0,1,8-8,52.06,52.06,0,0,0,52,52,8,8,0,0,1,0,16,68.08,68.08,0,0,1-40-13.13V102c0,24.26,19.74,44,44,44s44-19.74,44-44a8,8,0,0,1,16,0Z"></path></svg>
                   </a>
                   <Link href="/admin" className="admin-discrete" title="Área Restrita">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM232,128a104,104,0,1,1-104-104A104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                   </Link>
                </div>
             </div>
          </div>
      </footer>
    </div>
  );
}
