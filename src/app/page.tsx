'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Category, Platform } from '@/lib/types';
import { generateAllCopies, buildAffiliateLink, COPY_TEMPLATES } from '@/lib/copywriter';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'todos', label: 'Todos', icon: '🌐' },
  { value: 'tecnologia', label: 'Tecnologia', icon: '💻' },
  { value: 'mulher', label: 'Mulher', icon: '👗' },
  { value: 'casa', label: 'Casa', icon: '🏠' },
  { value: 'eletronicos', label: 'Eletrônicos', icon: '📱' },
  { value: 'foto_video', label: 'Foto e Vídeo', icon: '📸' },
];

const getPlatformDetails = (p: string) => {
  switch (p) {
    case 'mercadolivre': return { icon: '🟡', label: 'M. Livre', color: '#FFE600', textColor: '#2D3277' };
    case 'shopee': return { icon: '🟠', label: 'Shopee', color: '#EE4D2D', textColor: '#FFF' };
    case 'aliexpress': return { icon: '🔴', label: 'AliExpress', color: '#E62E04', textColor: '#FFF' };
    case 'amazon': return { icon: '🟡', label: 'Amazon', color: '#FF9900', textColor: '#FFF' };
    case 'lomadee': return { icon: '🔵', label: 'Lomadee', color: '#00A8FF', textColor: '#FFF' };
    case 'awin': return { icon: '🔵', label: 'Awin', color: '#00CCFF', textColor: '#FFF' };
    case 'rakuten': return { icon: '🔴', label: 'Rakuten', color: '#BF0000', textColor: '#FFF' };
    default: return { icon: '🌐', label: p, color: '#666', textColor: '#FFF' };
  }
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ProductCard = ({ product, onSelect, onCopy, copied }: { product: Product; onSelect: (p: Product) => void; onCopy: (p: Product) => void; copied: boolean }) => {
  const details = getPlatformDetails(product.platform);
  
  return (
    <div className="product-card border-glow" onClick={() => onSelect(product)}>
      <div className="product-image-container">
        <img src={product.image} alt={product.title} className="product-image" loading="lazy" />
        <div className="product-platform-badge" style={{ backgroundColor: details.color, color: details.textColor }}>
          <span className="platform-icon">{details.icon}</span>
          {details.label}
        </div>
        {product.discount && (
          <div className="product-discount-badge">-{product.discount}%</div>
        )}
      </div>
      <div className="product-card-body">
        <h3 className="product-title">{product.title}</h3>
        <div className="product-meta">
          <span className="product-rating">
            ⭐ {product.rating.toFixed(1)}
          </span>
          <span className="product-sales">
            📦 {product.sales.toLocaleString('pt-BR')} vendidos
          </span>
        </div>
        <div className="product-price-row">
          <span className="product-price">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="product-original-price">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        <div className="product-actions">
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onSelect(product); }}>
            ✍️ Gerar Copy
          </button>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 Ver Produto
          </a>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform>('todos');
  const [category, setCategory] = useState<Category>('todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTemplate, setActiveTemplate] = useState('aida');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [affiliateConfig, setAffiliateConfig] = useState({ 
    mercadolivreId: '', 
    shopeeId: '',
    aliexpressId: '',
    amazonId: '',
    lomadeeId: '',
    awinId: '',
    rakutenId: ''
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<Response>[] = [];
      if (platform === 'todos' || platform === 'mercadolivre') {
        promises.push(fetch(`/api/mercadolivre?category=${category}`));
      }
      if (platform === 'todos' || platform === 'shopee') {
        promises.push(fetch(`/api/shopee?category=${category}`));
      }
      if (platform === 'todos' || platform === 'aliexpress') {
        promises.push(fetch(`/api/aliexpress?category=${category}`));
      }
      if (platform === 'todos' || platform === 'amazon') {
        promises.push(fetch(`/api/amazon?category=${category}`));
      }
      if (platform === 'todos' || platform === 'lomadee') {
        promises.push(fetch(`/api/lomadee?category=${category}`));
      }
      if (platform === 'todos' || platform === 'awin') {
        promises.push(fetch(`/api/awin?category=${category}`));
      }
      if (platform === 'todos' || platform === 'rakuten') {
        promises.push(fetch(`/api/rakuten?category=${category}`));
      }

      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(r => r.json()));

      let allProducts: Product[] = [];
      data.forEach(d => {
        if (d.products) {
          allProducts = [...allProducts, ...d.products];
        }
      });

      // Sort by sales (trending)
      allProducts.sort((a, b) => b.sales - a.sales);
      setProducts(allProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
    setLoading(false);
  }, [platform, category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const saved = localStorage.getItem('affiliateConfig');
    if (saved) {
      try { setAffiliateConfig(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const getCopies = () => {
    if (!selectedProduct) return [];
    const link = buildAffiliateLink(selectedProduct, affiliateConfig);
    const all = generateAllCopies(selectedProduct, link);
    return all[activeTemplate as keyof typeof all] || [];
  };

  const formatPrice = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalSales = products.reduce((sum, p) => sum + p.sales, 0);
  const avgRating = products.length > 0
    ? (products.reduce((sum, p) => sum + p.rating, 0) / products.length).toFixed(1)
    : '0';

  return (
    <main className="main-container">
      {/* Hero */}
      <section className="hero-compact">
        <div className="hero-top">
          <img src="/logo.png" alt="Pega Essa Promo!" className="hero-logo-compact" />
          <div className="hero-info">
            <h1>
              Descubra os <span className="gradient-text">Produtos Quentes</span><br/>
              e Gere Copys que Vendem
            </h1>
            <p className="hero-desc-compact">
              Analise os mais vendidos do Mercado Livre e Shopee. Gere copys persuasivos com seu link de afiliado.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-icon">📦</span>
          <div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Produtos</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🔥</span>
          <div>
            <div className="stat-value">{totalSales.toLocaleString('pt-BR')}</div>
            <div className="stat-label">Vendas Total</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <div>
            <div className="stat-value">{avgRating}</div>
            <div className="stat-label">Nota Média</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📋</span>
          <div>
            <div className="stat-value">3</div>
            <div className="stat-label">Templates</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <section className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Plataforma</label>
            <div className="platform-tabs">
              {[
                { id: 'todos', label: 'Todas', icon: '🌐' },
                { id: 'mercadolivre', label: 'M. Livre', icon: '🟡' },
                { id: 'shopee', label: 'Shopee', icon: '🟠' },
                { id: 'aliexpress', label: 'AliExpress', icon: '🔴' },
                { id: 'amazon', label: 'Amazon', icon: '🟡' },
                { id: 'lomadee', label: 'Lomadee', icon: '🔵' },
                { id: 'awin', label: 'Awin', icon: '🔵' },
                { id: 'rakuten', label: 'Rakuten', icon: '🔴' },
              ].map((p) => (
                <button
                  key={p.id}
                  className={`platform-tab ${platform === p.id ? 'active' : ''}`}
                  onClick={() => setPlatform(p.id as Platform)}
                >
                  <span className="platform-icon">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="category-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`category-btn ${category === cat.value ? 'active' : ''}`}
              onClick={() => setCategory(cat.value)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Products */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <div className="loading-text">Buscando produtos quentes...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>Nenhum produto encontrado para esta categoria.</p>
        </div>
      ) : (
        <>
          <div className="products-section-title">
            🔥 Produtos em Alta ({products.length})
          </div>
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onSelect={setSelectedProduct} 
                onCopy={(p) => {
                  setSelectedProduct(p);
                  // handleCopy logic will follow in the modal
                }}
                copied={false} // State managed via copiedIndex effectively
              />
            ))}
          </div>
        </>
      )}

      {/* Copy Generator Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✍️ Gerador de Copys</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Product info */}
              <div className="modal-product-info">
                <div className="modal-product-image">
                  <img src={selectedProduct.image} alt={selectedProduct.title} />
                </div>
                <div className="modal-product-details">
                  <h3>{selectedProduct.title}</h3>
                  <p className="price">{formatPrice(selectedProduct.price)}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ⭐ {selectedProduct.rating.toFixed(1)} · {selectedProduct.sales.toLocaleString('pt-BR')} vendidos ·{' '}
                  {getPlatformDetails(selectedProduct.platform).icon} {getPlatformDetails(selectedProduct.platform).label}
                </p>
              </div>
            </div>

            {/* Template tabs */}
            <div className="template-tabs">
              {COPY_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`template-tab ${activeTemplate === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTemplate(t.id)}
                >
                  {t.icon} {t.name}
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({t.description})</span>
                </button>
              ))}
            </div>

            {/* Copies */}
            <div className="copies-grid">
              {getCopies().map((copy, i) => (
                <div key={i} className="copy-card">
                  <div className="copy-card-header">
                    <span className="copy-card-title">{copy.title}</span>
                    <button
                      className={`copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                      onClick={() => handleCopy(copy.body + (copy.hashtags ? '\n\n' + copy.hashtags : ''), i)}
                    >
                      {copiedIndex === i ? '✅ Copiado!' : '📋 Copiar'}
                    </button>
                  </div>
                  <div className="copy-card-body">
                    <div className="copy-text">{copy.body}</div>
                    {copy.hashtags && (
                      <div className="copy-hashtags">{copy.hashtags}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(!affiliateConfig.mercadolivreId || !affiliateConfig.shopeeId || !affiliateConfig.aliexpressId || 
              !affiliateConfig.amazonId || !affiliateConfig.lomadeeId || !affiliateConfig.awinId || !affiliateConfig.rakutenId) && (
              <div style={{
                marginTop: '1rem',
                padding: '12px 16px',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                color: 'var(--accent-orange)',
              }}>
                ⚠️ Configure seus links de afiliados em{' '}
                <a href="/configuracoes" style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
                  Configurações
                </a>{' '}
                para incluir seu ID nos copys de todas as plataformas.
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
