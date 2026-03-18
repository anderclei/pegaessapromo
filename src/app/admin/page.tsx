'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Platform } from '@/lib/types';
import { generateAllCopies, buildAffiliateLink, COPY_TEMPLATES } from '@/lib/copywriter';
import { BotStatus, WhatsAppGroup, PostLog } from '@/lib/bots/types';
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
  
  // WhatsApp Bot State
  const [botStatus, setBotStatus] = useState<BotStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [wpGroups, setWpGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [activeBotTab, setActiveBotTab] = useState<'connection' | 'groups' | 'logs'>('connection');
  const [loadingGroups, setLoadingGroups] = useState(false);
  
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

  // --- WhatsApp Bot Actions ---
  const handleStartBot = async () => {
    setBotStatus('connecting');
    try {
      const res = await fetch('/api/bots/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      if (data.state) {
        setBotStatus(data.state.status);
        setQrCode(data.state.qrCode);
      }
    } catch (e) {
      setBotStatus('error');
      console.error(e);
    }
  };

  const handleStopBot = async () => {
    try {
      await fetch('/api/bots/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      setBotStatus('disconnected');
      setQrCode(null);
    } catch (e) { console.error(e); }
  };

  const syncBotState = useCallback(async () => {
    try {
      const res = await fetch('/api/bots/whatsapp');
      const data = await res.json();
      setBotStatus(data.status);
      setQrCode(data.qrCode);
      if (data.groups && data.groups.length > 0) setWpGroups(data.groups);

      const schRes = await fetch('/api/bots/schedule');
      const schData = await schRes.json();
      setScheduleEnabled(schData.isRunning);
      setSelectedGroups(schData.selectedGroups || []);
      if (schData.logs) setLogs(schData.logs);
    } catch (e) { console.error(e); }
  }, []);

  const handleToggleSchedule = async () => {
    const action = scheduleEnabled ? 'stop' : 'start';
    try {
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          groups: selectedGroups,
          affiliateConfig
        })
      });
      if (res.ok) setScheduleEnabled(!scheduleEnabled);
    } catch (e) { console.error(e); }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };



  useEffect(() => {
    syncBotState();
    const interval = setInterval(syncBotState, 5000);
    
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const cloudConfig = await res.json();
          if (cloudConfig && Object.keys(cloudConfig).length > 0) {
            setAffiliateConfig(prev => ({ ...prev, ...cloudConfig }));
            return;
          }
        }
      } catch (e) { console.error('Cloud load failed', e); }

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
    };

    loadConfig();
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(console.error);

    return () => clearInterval(interval);
  }, [activePlatform, syncBotState]);

  const handleSaveSettings = async () => {
    localStorage.setItem('affiliateConfig', JSON.stringify(affiliateConfig));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(affiliateConfig)
      });
    } catch (e) {
      console.error('Failed to sync settings to cloud', e);
    }
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
            <div className="admin-header-row" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-title-section">
                <h2>🤖 Gestor de Automação WhatsApp</h2>
                <p>Conecte o robô e selecione os grupos para postagens automáticas com IA.</p>
              </div>
              <div className="bot-status-badge" style={{ 
                padding: '6px 12px', 
                borderRadius: '20px', 
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: botStatus === 'connected' ? '#dcfce7' : '#fee2e2',
                color: botStatus === 'connected' ? '#166534' : '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: botStatus === 'connected' ? '#22c55e' : '#ef4444' }}></div>
                {botStatus.toUpperCase()}
              </div>
            </div>

            <div className="admin-tabs" style={{ marginBottom: '1.5rem', borderBottom: 'none' }}>
              <button 
                onClick={() => setActiveBotTab('connection')}
                className={`admin-tab ${activeBotTab === 'connection' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '8px 16px' }}
              >
                🔗 Conexão
              </button>
              <button 
                onClick={() => setActiveBotTab('groups')}
                className={`admin-tab ${activeBotTab === 'groups' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '8px 16px' }}
              >
                👥 Grupos Automáticos
              </button>
              <button 
                onClick={() => setActiveBotTab('logs')}
                className={`admin-tab ${activeBotTab === 'logs' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '8px 16px' }}
              >
                📜 Relatório de Envios
              </button>
            </div>

            {activeBotTab === 'connection' && (
              <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                {botStatus === 'disconnected' && (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
                    <h3>Conectar WhatsApp</h3>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>Inicie o robô para gerar o QR Code de conexão.</p>
                    <button className="btn btn-primary" onClick={handleStartBot}>🚀 Iniciar Robô de Vendas</button>
                  </>
                )}

                {botStatus === 'connecting' && <div className="admin-loading">Iniciando servidor do bot...</div>}

                {botStatus === 'qr_ready' && qrCode && (
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '15px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#000' }}>Escaneie o QR Code</h3>
                    <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>Abra o WhatsApp {'>'} Aparelhos Conectados</p>
                  </div>
                )}

                {botStatus === 'connected' && (
                   <div style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                      <h3 style={{ color: '#000' }}>Robô Conectado e Ativo!</h3>
                      <p style={{ color: '#64748b', marginBottom: '2rem' }}>O sistema está pronto para monitorar as melhores ofertas da Amazon.</p>
                      <button className="btn btn-delete" style={{ padding: '10px 20px' }} onClick={handleStopBot}>Desconectar Aparelho</button>
                   </div>
                )}
              </div>
            )}

            {activeBotTab === 'groups' && (
              <div className="admin-card">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h3>Seleção de Grupos Alvo</h3>
                      <p style={{ fontSize: '0.85rem' }}>Escolha em quais grupos o robô deve postar as ofertas.</p>
                    </div>
                    <button 
                      className={`btn ${scheduleEnabled ? 'btn-delete' : 'btn-primary'}`}
                      onClick={handleToggleSchedule}
                      disabled={botStatus !== 'connected' || selectedGroups.length === 0}
                      style={{ opacity: (botStatus !== 'connected' || selectedGroups.length === 0) ? 0.5 : 1 }}
                    >
                      {scheduleEnabled ? '🛑 Parar Automação' : '⚡ Ativar Postagem IA'}
                    </button>
                 </div>

                 {botStatus !== 'connected' ? (
                   <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      Primeiro conecte o WhatsApp na aba <b>Conexão</b> para listar seus grupos.
                   </div>
                 ) : (
                   <div className="groups-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                      {wpGroups.map(group => (
                        <div key={group.id} 
                          onClick={() => toggleGroup(group.id)}
                          style={{ 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: '1px solid',
                            borderColor: selectedGroups.includes(group.id) ? '#22c55e' : '#e2e8f0',
                            backgroundColor: selectedGroups.includes(group.id) ? '#f0fdf4' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            border: '2px solid',
                            borderColor: selectedGroups.includes(group.id) ? '#22c55e' : '#cbd5e1',
                            backgroundColor: selectedGroups.includes(group.id) ? '#22c55e' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px'
                          }}>
                            {selectedGroups.includes(group.id) && '✓'}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#000' }}>{group.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{group.participantsCount} participantes</div>
                          </div>
                        </div>
                      ))}
                      {wpGroups.length === 0 && <div className="admin-loading">Buscando grupos no seu WhatsApp...</div>}
                   </div>
                 )}
              </div>
            )}

            {activeBotTab === 'logs' && (
              <div className="admin-card">
                 <h3>Relatório de Atividade Recente</h3>
                 <div style={{ marginTop: '1.5rem' }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ 
                        padding: '12px', 
                        borderBottom: '1px solid #f1f5f9', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: '#000' }}>{log.productTitle}</span>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Postado em: {log.groupName}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: log.status === 'success' ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                            {log.status === 'success' ? 'Sucesso' : 'Erro'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Nenhum envio registrado ainda.</p>}
                 </div>
              </div>
            )}
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
