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
  const [activeTab, setActiveTab] = useState<'settings' | 'bots' | 'categories'>('settings');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<Platform>('amazon');
  
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
    rakutenId: '',
    geminiKey: '',
    siteUrl: 'https://pegaessapromo.com.br'
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



  useEffect(() => {
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
          amazonSecretKey: (isTestData || !parsed.amazonSecretKey) ? prev.amazonSecretKey : parsed.amazonSecretKey,
          geminiKey: parsed.geminiKey || '',
          siteUrl: parsed.siteUrl || 'https://pegaessapromo.com.br'
        })); 
      } catch {}
    }
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(console.error);
  }, [activePlatform]);

  const handleSaveSettings = () => {
    localStorage.setItem('affiliateConfig', JSON.stringify(affiliateConfig));
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };



  return (
    <div className="admin-container">
      <div className="catalogue-container">
        {/* Admin Tabs */}
        <div className="admin-tabs">
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



        {activeTab === 'settings' && (
          <section className="settings-section">
            <div className="admin-header-row" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-title-section">
                <h2>⚙️ Configurações do Sistema</h2>
                <p>Gerencie suas chaves de afiliado e integrações com Inteligência Artificial.</p>
              </div>
            </div>

            <div className="admin-card">
               <h3>🛒 Configurações de Afiliado (Amazon)</h3>
               <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                 Configure sua Associate Tag e chaves da API Amazon para sincronização automática.
               </p>
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
                    type="password" placeholder="Sua Secret Key"
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.amazonSecretKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, amazonSecretKey: e.target.value})}
                  />
               </div>
            </div>

            <div className="admin-card" style={{ marginTop: '2rem' }}>
               <h3>🤖 Inteligência Artificial (Gemini)</h3>
               <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                 A chave do Gemini é usada para gerar as copys altamente persuasivas para seus grupos automaticamente.
               </p>
               <div className="form-field">
                  <label style={{ color: '#333', fontWeight: 'bold' }}>Google Gemini API Key</label>
                  <input 
                    type="password" placeholder="Cole sua chave do AI Studio aqui"
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.geminiKey}
                    onChange={e => setAffiliateConfig({...affiliateConfig, geminiKey: e.target.value})}
                  />
               </div>
            </div>

            <div className="admin-card" style={{ marginTop: '2rem' }}>
               <h3>🌐 Configurações do Portal</h3>
               <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                 URL base usada para gerar os links encurtados que levam os clientes para o seu site.
               </p>
               <div className="form-field">
                  <label style={{ color: '#333', fontWeight: 'bold' }}>URL Base do seu Portal</label>
                  <input 
                    type="text" placeholder="Ex: https://pegaessapromo.com.br"
                    style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                    value={affiliateConfig.siteUrl}
                    onChange={e => setAffiliateConfig({...affiliateConfig, siteUrl: e.target.value})}
                  />
               </div>
            </div>

            <div style={{ marginTop: '2rem', position: 'sticky', bottom: '2rem' }}>
              <button 
                className="btn btn-primary settings-save-btn" 
                style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                onClick={handleSaveSettings}
              >
                {saveStatus ? '✅ Todas as Configurações Salvas!' : '💾 Salvar Tudo'}
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


    </div>
  );
}
