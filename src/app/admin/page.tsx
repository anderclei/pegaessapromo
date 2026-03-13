'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Category, Platform } from '@/lib/types';
import { generateAllCopies, buildAffiliateLink, COPY_TEMPLATES } from '@/lib/copywriter';
import Link from 'next/link';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'instrumentos_musicais', label: 'Instrumentos Musicais', icon: '🎸' },
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

const ProductCardAdmin = ({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) => {
  const getLogo = (p: string) => {
    switch (p) {
      case 'amazon': return '/logos/amazon.jpg';
      case 'shopee': return '/logos/shopee.jpg';
      case 'mercadolivre': return '/logos/mercadolivre.png';
      default: return '/logos/amazon.jpg';
    }
  };

  return (
    <div className="product-card border-glow" onClick={() => onSelect(product)} style={{ cursor: 'pointer' }}>
      <div className="product-image-container">
        <img src={product.image} alt={product.title} className="product-image" loading="lazy" />
        <div className="product-platform-circle">
           <img src={getLogo(product.platform)} alt={product.platform} />
        </div>
        {product.discount && (
          <div className="product-discount-badge">-{product.discount}%</div>
        )}
      </div>
      <div className="product-card-body">
        <div className="product-meta">
          <span className="product-sales">📦 {product.sales.toLocaleString('pt-BR')}+ vendidos</span>
        </div>
        <h3 className="product-title" style={{ fontSize: '0.9rem', height: '2.4rem', overflow: 'hidden' }}>{product.title}</h3>
        <div className="product-price-row">
          <span className="product-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem', padding: '6px' }} onClick={(e) => { e.stopPropagation(); onSelect(product); }}>
          ⚙️ Gerar Copy
        </button>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'bots'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTemplate, setActiveTemplate] = useState('aida');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [manualLink, setManualLink] = useState('');
  
  // Settings State
  const [affiliateConfig, setAffiliateConfig] = useState({ 
    amazonId: 'andercleipino-20',
    amazonAccessKey: '',
    amazonSecretKey: '',
    shopeeId: '',
    aliexpressId: '',
    mercadolivreId: '', 
    lomadeeId: '',
    awinId: '',
    rakutenId: ''
  });
  const [saveStatus, setSaveStatus] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/amazon?category=instrumentos_musicais`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products.sort((a: any, b: any) => b.sales - a.sales));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
    const saved = localStorage.getItem('affiliateConfig');
    if (saved) {
      try { setAffiliateConfig(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
    }
  }, [fetchProducts]);

  const handleSaveSettings = () => {
    localStorage.setItem('affiliateConfig', JSON.stringify(affiliateConfig));
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/amazon/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: affiliateConfig })
      });
      if (res.ok) { fetchProducts(); alert('Sincronização OK!'); }
    } catch (err) { alert('Erro na sincronização'); }
    setSyncing(false);
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCopies = () => {
    if (!selectedProduct) return [];
    const link = manualLink || buildAffiliateLink(selectedProduct, affiliateConfig);
    const all = generateAllCopies(selectedProduct, link);
    return all[activeTemplate as keyof typeof all] || [];
  };

  return (
    <div className="landing-wrapper" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div className="catalogue-container" style={{ padding: '2rem 0' }}>
        {/* Admin Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ padding: '8px 16px', borderRadius: '8px', background: activeTab === 'dashboard' ? '#000' : 'transparent', color: activeTab === 'dashboard' ? 'white' : '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            style={{ padding: '8px 16px', borderRadius: '8px', background: activeTab === 'settings' ? '#000' : 'transparent', color: activeTab === 'settings' ? 'white' : '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            ⚙️ Configurações
          </button>
          <button 
            onClick={() => setActiveTab('bots')}
            style={{ padding: '8px 16px', borderRadius: '8px', background: activeTab === 'bots' ? '#000' : 'transparent', color: activeTab === 'bots' ? 'white' : '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            🤖 Config Bot
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gestão de Ofertas</h2>
                <p style={{ color: '#64748b' }}>Sincronize e gere conteúdos para seus produtos</p>
              </div>
              <button 
                className={`btn btn-primary ${syncing ? 'loading' : ''}`}
                onClick={handleSync}
                disabled={syncing}
                style={{ height: '44px' }}
              >
                {syncing ? '🔄 Sincronizando...' : '✨ Sincronizar Amazon'}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>Carregando...</div>
            ) : (
              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {products.map(p => <ProductCardAdmin key={p.id} product={p} onSelect={setSelectedProduct} />)}
              </div>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Configurações de Afiliado</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Configure suas chaves API e Partner Tags</p>

            <div className="premium-card" style={{ padding: '2rem', background: 'white' }}>
               <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Amazon Brasil</h3>
               <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Associate Tag (Partner Tag)</label>
                  <input 
                    type="text" className="form-input" placeholder="Ex: seunid-20"
                    value={affiliateConfig.amazonId}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonId: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
               </div>
               <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Access Key</label>
                  <input 
                    type="text" className="form-input" placeholder="AKIA..."
                    value={affiliateConfig.amazonAccessKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonAccessKey: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
               </div>
               <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Secret Key</label>
                  <input 
                    type="password" className="form-input" placeholder="••••••••"
                    value={affiliateConfig.amazonSecretKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonSecretKey: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
               </div>
               <button 
                className="btn btn-primary" 
                onClick={handleSaveSettings}
                style={{ marginTop: '1rem' }}
               >
                 {saveStatus ? '✅ Salvo com Sucesso!' : '💾 Salvar Configurações'}
               </button>
            </div>
          </section>
        )}

        {activeTab === 'bots' && (
          <section style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>🤖 Configuração de Bots</h2>
            <div style={{ padding: '3rem', border: '2px dashed #e2e8f0', borderRadius: '1rem', textAlign: 'center', color: '#64748b' }}>
               <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Em breve...</p>
               <p>Estamos trabalhando na integração direta com bots de Telegram e WhatsApp.</p>
            </div>
          </section>
        )}
      </div>

      {/* Copy Generator Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', color: '#333' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #eee' }}>
              <h2 className="modal-title">✍️ Gerador de Copys</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Product info */}
              <div className="modal-product-info" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                <div className="modal-product-image">
                  <img src={selectedProduct.image} alt={selectedProduct.title} />
                </div>
                <div className="modal-product-details">
                  <h3>{selectedProduct.title}</h3>
                  <p className="price">{formatPrice(selectedProduct.price)}</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Amazon Brasil</p>
                </div>
              </div>

              {/* Template tabs */}
              <div className="template-tabs" style={{ marginTop: '1.5rem' }}>
                {COPY_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    className={`template-tab ${activeTemplate === t.id ? 'active' : ''}`}
                    onClick={() => setActiveTemplate(t.id)}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>

              {/* Copies */}
              <div className="copies-grid" style={{ marginTop: '1.5rem' }}>
                <div className="copy-card" style={{ border: '1px solid #f59e0b', background: '#fffbeb' }}>
                  <div className="copy-card-header" style={{ background: '#fef3c7' }}>
                    <span className="copy-card-title">🚀 Link da Bridge Page Premium</span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      onClick={async () => {
                        const link = manualLink || buildAffiliateLink(selectedProduct, affiliateConfig);
                        const res = await fetch('/api/promotions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ product: selectedProduct, affiliateLink: link }),
                        });
                        const data = await res.json();
                        if (data.id) handleCopy(`${window.location.origin}/p/${data.id}`, 999);
                      }}
                    >
                      {copiedIndex === 999 ? '✅ Link Copiado!' : '✨ Gerar'}
                    </button>
                  </div>
                  <div className="copy-card-body">
                    <input 
                      type="text" className="form-input" placeholder="Link manual (opcional)" 
                      value={manualLink} onChange={e => setManualLink(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '6px', marginBottom: '8px' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#666' }}>Cria uma landing page profissional para conversão máxima.</p>
                  </div>
                </div>

                {getCopies().map((copy, i) => (
                  <div key={i} className="copy-card">
                    <div className="copy-card-header">
                      <span className="copy-card-title">{copy.title}</span>
                      <button className="copy-btn" onClick={() => handleCopy(copy.body + '\n\n' + (copy.hashtags || ''), i)}>
                        {copiedIndex === i ? '✅ Copiado!' : '📋 Copiar'}
                      </button>
                    </div>
                    <div className="copy-card-body">
                      <div className="copy-text" style={{ fontSize: '0.85rem' }}>{copy.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
