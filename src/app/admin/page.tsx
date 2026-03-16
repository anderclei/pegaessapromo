'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Platform } from '@/lib/types';
import { generateAllCopies, buildAffiliateLink, COPY_TEMPLATES } from '@/lib/copywriter';
import './admin.css';

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
    <div className="product-card border-glow clickable" onClick={() => onSelect(product)}>
      <div className="product-image-container">
        <img src={product.image} alt={product.title} className="product-image" loading="lazy" />
        <div className="product-platform-circle">
           <img src={getLogo(product.platform)} alt={product.platform} />
        </div>
        {product.discount && (
          <div className="product-discount-badge">-{product.discount}%</div>
        )}
        {product.type === 'lightning' && (
          <div className="product-discount-badge lightning-type-badge">⚡ RELÂMPAGO</div>
        )}
        {product.type === 'super' && (
          <div className="product-discount-badge super-type-badge">💸 SUPER</div>
        )}
      </div>
      <div className="product-card-body">
        <div className="product-meta">
          <span className="product-sales">📦 {product.sales.toLocaleString('pt-BR')}+ vendidos</span>
        </div>
        <h3 className="product-title">{product.title}</h3>
        <div className="product-price-row">
          <span className="product-price">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <button className="btn btn-primary admin-card-cta" onClick={(e) => { e.stopPropagation(); onSelect(product); }}>
          ⚙️ Gerar Copy
        </button>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'bots' | 'categories'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchType, setFetchType] = useState<'bestsellers' | 'lightning' | 'super'>('bestsellers');
  const [activePlatform, setActivePlatform] = useState<Platform>('amazon');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTemplate, setActiveTemplate] = useState('aida');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [manualLink, setManualLink] = useState('');
  
  // Settings State
  const [affiliateConfig, setAffiliateConfig] = useState({ 
    amazonId: 'andercleipino-20',
    amazonAccessKey: 'amzn1.application-oa2-client.27e8dc0d2d1d48b29a171860cf840a12',
    amazonSecretKey: 'amzn1.oa2-cs.v1.b69c917a94b07978ac42e9a484a4728ce6c7461afe375491a4701179795bb397a',
    shopeeId: '',
    aliexpressId: '',
    mercadolivreId: '', 
    lomadeeId: '',
    awinId: '',
    rakutenId: ''
  });
  const [saveStatus, setSaveStatus] = useState(false);
  
  // Categories State
  const [dbCategories, setDbCategories] = useState<{id: string, label: string, amazonSlug?: string}[]>([]);
  const [newCategory, setNewCategory] = useState({ id: '', label: '', amazonSlug: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmazonSlug, setEditAmazonSlug] = useState('');

  const startEditing = (cat: any) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditAmazonSlug(cat.amazonSlug || '');
  };

  const handleAddCategory = async () => {
    if (!newCategory.id || !newCategory.label) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      if (res.ok) {
        setDbCategories([...dbCategories, newCategory]);
        setNewCategory({ id: '', label: '', amazonSlug: '' });
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: editLabel, amazonSlug: editAmazonSlug })
      });
      if (res.ok) {
        const updated = await res.json();
        setDbCategories(dbCategories.map(c => c.id === id ? updated : c));
        setEditingId(null);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Excluir categoria?`)) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setDbCategories(dbCategories.filter(c => c.id !== id));
      }
    } catch (err) { console.error(err); }
  };

  const handleMoveCategory = async (index: number, direction: number) => {
    const newCats = [...dbCategories];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCats })
      });
      if (res.ok) setDbCategories(newCats);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = useCallback(async (type?: string, platform?: Platform) => {
    setLoading(true);
    const targetType = type || fetchType;
    const targetPlatform = platform || activePlatform;
    try {
      const endpoint = targetPlatform === 'amazon' ? '/api/amazon' : 
                       targetPlatform === 'shopee' ? '/api/shopee' : 
                       '/api/mercadolivre';
      
      const res = await fetch(`${endpoint}?category=instrumentos_musicais&type=${targetType}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products.sort((a: any, b: any) => b.sales - a.sales));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [fetchType, activePlatform]);

  useEffect(() => {
    fetchProducts();
    const saved = localStorage.getItem('affiliateConfig');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        const isTestData = 
          parsed.amazonAccessKey?.includes('@') || 
          parsed.amazonSecretKey === 'password123' ||
          parsed.amazonId?.includes('dummy') ||
          parsed.amazonAccessKey?.includes('DUMMY') ||
          parsed.amazonSecretKey?.includes('dummy');
        
        setAffiliateConfig(prev => ({ 
          ...prev, 
          ...parsed,
          amazonId: (isTestData || !parsed.amazonId) ? prev.amazonId : parsed.amazonId,
          amazonAccessKey: (isTestData || !parsed.amazonAccessKey) ? prev.amazonAccessKey : parsed.amazonAccessKey,
          amazonSecretKey: (isTestData || !parsed.amazonSecretKey) ? prev.amazonSecretKey : parsed.amazonSecretKey
        })); 
      } catch {}
    }
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(console.error);
  }, [fetchType, activePlatform, fetchProducts]);

  const handleSaveSettings = () => {
    localStorage.setItem('affiliateConfig', JSON.stringify(affiliateConfig));
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(10);
    try {
      const endpoint = activePlatform === 'amazon' ? '/api/amazon/sync' : 
                       activePlatform === 'shopee' ? '/api/shopee/sync' : 
                       '/api/mercadolivre/sync';
      
      // Simulate gradual progress while fetching
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 1000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: affiliateConfig })
      });
      
      clearInterval(progressInterval);
      setSyncProgress(100);

      if (res.ok) { 
        fetchProducts(); 
        setTimeout(() => {
          alert('Sincronização Amazon OK!');
          setSyncProgress(0);
        }, 500);
      }
      else { 
        alert('Esta plataforma requer configuração API válida para sincronização.'); 
        setSyncProgress(0);
      }
    } catch (err) { 
      alert('Erro na sincronização'); 
      setSyncProgress(0);
    }
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
    <div className="admin-container">
      <div className="catalogue-container">
        {/* Admin Tabs */}
        <div className="admin-tabs">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          >
            ⚙️ Configurações
          </button>
          <button 
            onClick={() => setActiveTab('bots')}
            className={`admin-tab ${activeTab === 'bots' ? 'active' : ''}`}
          >
            🤖 Config Bot
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
          >
            📂 Categorias
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <section>
            <div className="admin-header-row">
              <div className="admin-title-section">
                <h2>Gestão de Ofertas Amazon</h2>
                <p>Sincronize e gere conteúdos exclusivos para a Amazon</p>
                <div className="type-filter-group">
                  <button 
                    onClick={() => setFetchType('bestsellers')}
                    className={`type-filter-btn ${fetchType === 'bestsellers' ? 'active-bestseller' : ''}`}
                  >
                    🔥 Mais Vendidos
                  </button>
                  <button 
                    onClick={() => setFetchType('lightning')}
                    className={`type-filter-btn ${fetchType === 'lightning' ? 'active-lightning' : ''}`}
                  >
                    ⚡ Ofertas Relâmpago
                  </button>
                  <button 
                    onClick={() => setFetchType('super')}
                    className={`type-filter-btn ${fetchType === 'super' ? 'active-super' : ''}`}
                  >
                    💸 Super Descontos
                  </button>
                </div>
              </div>
              <div className="admin-actions-row">
                <div className="platform-selector-card">
                   <button
                      onClick={() => setActivePlatform('amazon')}
                      className={`platform-btn ${activePlatform === 'amazon' ? 'active' : ''}`}
                    >
                      Amazon
                    </button>
                    {/* Phase 2 indicators */}
                    <button className="platform-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Shopee (Phase 2)</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
                  <button 
                    className={`btn btn-primary sync-btn ${syncing ? 'loading' : ''}`}
                    style={{ width: '100%' }}
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? '🔄 Sincronizando...' : `✨ Sincronizar Amazon`}
                  </button>
                  
                  {syncing && (
                    <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${syncProgress}%`, 
                        height: '100%', 
                        backgroundColor: '#fbbf24', 
                        transition: 'width 0.3s ease' 
                      }}></div>
                    </div>
                  )}
                  {syncing && <span style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>{syncProgress}% concluído</span>}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">Carregando ofertas Amazon...</div>
            ) : (
              <div className="products-grid admin-grid">
                {products.filter(p => p.platform === 'amazon').map(p => <ProductCardAdmin key={p.id} product={p} onSelect={setSelectedProduct} />)}
              </div>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-section">
            <h2>Configurações de Afiliado</h2>
            <p>Configure suas chaves API e Partner Tags Amazon</p>

            <div className="admin-card">
               <h3>Amazon Brasil</h3>
               <div className="form-field">
                  <label style={{ color: '#333', fontWeight: 'bold' }}>Associate Tag (Partner Tag)</label>
                  <input 
                    type="text" placeholder="Ex: seunid-20"
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.amazonId}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonId: e.target.value})}
                  />
               </div>
               <div className="form-field">
                  <label style={{ color: '#333', fontWeight: 'bold' }}>Access Key</label>
                  <input 
                    type="text" placeholder="AKIA..."
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.amazonAccessKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonAccessKey: e.target.value})}
                  />
               </div>
               <div className="form-field">
                  <label style={{ color: '#333', fontWeight: 'bold' }}>Secret Key</label>
                  <input 
                    type="text" placeholder="Secret Key"
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.amazonSecretKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonSecretKey: e.target.value})}
                  />
               </div>
               <button 
                className="btn btn-primary settings-save-btn" 
                onClick={handleSaveSettings}
               >
                 {saveStatus ? '✅ Salvo com Sucesso!' : '💾 Salvar Configurações'}
               </button>
            </div>
          </section>
        )}

        {activeTab === 'bots' && (
          <section className="settings-section">
            <h2>🤖 Configuração de Bots</h2>
            <div className="empty-state">
               <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Em breve...</p>
               <p>Estamos trabalhando na integração direta com bots de Telegram e WhatsApp.</p>
            </div>
          </section>
        )}

        {activeTab === 'categories' && (
          <section className="settings-section">
            <h2>📂 Gestão de Categorias</h2>
            <p className="admin-subtitle">Configure as abas do site e os links da Amazon para cada uma.</p>
            
            <div className="admin-card" style={{ marginBottom: '2rem' }}>
              <h3>Nova Categoria</h3>
              <div className="form-field-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>ID (Ex: informatica)</label>
                  <input 
                    type="text" 
                    value={newCategory.id}
                    onChange={e => setNewCategory({...newCategory, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    placeholder="Slug único"
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Nome Visível</label>
                  <input 
                    type="text" 
                    value={newCategory.label}
                    onChange={e => setNewCategory({...newCategory, label: e.target.value})}
                    placeholder="Ex: Informática"
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Amazon Slug</label>
                  <input 
                    type="text" 
                    value={newCategory.amazonSlug}
                    onChange={e => setNewCategory({...newCategory, amazonSlug: e.target.value})}
                    placeholder="Ex: computers"
                  />
                </div>
                <button className="btn btn-primary" style={{ height: '42px' }} onClick={handleAddCategory}> Adicionar </button>
              </div>
            </div>

            <div className="admin-card">
              <h3>Categorias Ativas</h3>
              <div className="categories-list" style={{ marginTop: '1rem' }}>
                {dbCategories.map((cat, index) => (
                  <div key={cat.id} className="category-item-admin" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                      <div className="order-controls" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button disabled={index === 0} onClick={() => handleMoveCategory(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                        <button disabled={index === dbCategories.length - 1} onClick={() => handleMoveCategory(index, 1)} style={{ opacity: index === dbCategories.length - 1 ? 0.3 : 1 }}>▼</button>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        {editingId === cat.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', display: 'block' }}>Nome</label>
                              <input 
                                className="form-field-input"
                                style={{ width: '100%' }}
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', display: 'block' }}>Amazon Slug</label>
                              <input 
                                className="form-field-input"
                                style={{ width: '100%' }}
                                value={editAmazonSlug}
                                onChange={e => setEditAmazonSlug(e.target.value)}
                              />
                            </div>
                            <button className="btn btn-sm" style={{ alignSelf: 'flex-end', backgroundColor: '#22c55e', color: 'white' }} onClick={() => handleUpdateCategory(cat.id)}>✅</button>
                            <button className="btn btn-sm" style={{ alignSelf: 'flex-end', backgroundColor: '#64748b', color: 'white' }} onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{cat.label}</span>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                              <span style={{ marginRight: '1rem' }}>ID: <code>{cat.id}</code></span>
                              <span>Amazon: <code style={{ color: '#2563eb' }}>{cat.amazonSlug || 'padrão'}</code></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="cat-actions" style={{ marginLeft: '1rem' }}>
                      {!editingId && (
                        <>
                          <button className="btn btn-icon" onClick={() => startEditing(cat)}>✏️</button>
                          <button className="btn btn-icon btn-delete" onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Copy Generator Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✍️ Gerador de Copys Amazon</h2>
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
                  <p className="platform-label">Amazon Brasil</p>
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
                  </button>
                ))}
              </div>

              {/* Copies */}
              <div className="copies-grid">
                <div className="copy-card highlight">
                  <div className="copy-card-header">
                    <span className="copy-card-title">🚀 Link da Bridge Page Premium</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        const link = manualLink || buildAffiliateLink(selectedProduct, affiliateConfig);
                        const productToSave = { ...selectedProduct, type: selectedProduct.type || fetchType };
                        const res = await fetch('/api/promotions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ product: productToSave, affiliateLink: link }),
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
                      type="text" className="form-field-input" placeholder="Link manual (opcional)" 
                      value={manualLink} onChange={e => setManualLink(e.target.value)}
                    />
                    <p className="hint">Cria uma landing page profissional para conversão máxima.</p>
                  </div>
                </div>

                {getCopies().map((copy, idx) => (
                  <div key={idx} className="copy-card">
                    <div className="copy-card-header">
                      <span className="copy-card-title">{copy.title}</span>
                      <button className="copy-btn" onClick={() => handleCopy(copy.body + '\n\n' + (copy.hashtags || ''), idx)}>
                        {copiedIndex === idx ? '✅ Copiado!' : '📋 Copiar'}
                      </button>
                    </div>
                    <div className="copy-card-body">
                      <div className="copy-text">{copy.body}</div>
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
