'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Platform, Coupon } from '@/lib/types';
import Link from 'next/link';
import { generateAllCopies, buildAffiliateLink, COPY_TEMPLATES } from '@/lib/copywriter';
import { BotStatus, WhatsAppGroup, PostLog } from '@/lib/bots/types';
import { GroupPool, PoolGroup } from '@/lib/bots/group-pools';
import './admin.css';

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ─── Shopee API Accordion Component ──────────────────────────────────────────

function ShopeeApiAccordion({
  affiliateConfig,
  setAffiliateConfig,
  activeAccordion,
  setActiveAccordion,
}: {
  affiliateConfig: any;
  setAffiliateConfig: (c: any) => void;
  activeAccordion: string;
  setActiveAccordion: (s: string) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ synced: boolean; lastSync?: string; totalProducts?: number; syncMode?: string } | null>(null);

  useEffect(() => {
    fetch('/api/shopee/sync')
      .then(r => r.json())
      .then(setSyncStatus)
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    if (!affiliateConfig.shopeePartnerId || !affiliateConfig.shopeePartnerKey) {
      alert('Preencha o Partner ID e Partner Key primeiro!');
      return;
    }
    setSyncing(true);
    try {
      // Salva as configs antes de sincronizar
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(affiliateConfig),
      });
      const res = await fetch('/api/shopee/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setSyncStatus({ synced: true, lastSync: data.syncedAt, totalProducts: Object.values(data.results as Record<string, number>).reduce((a, b) => a + b, 0), syncMode: 'api' });
      } else {
        alert(`❌ Erro: ${data.error}\n${data.hint || ''}`);
      }
    } catch (e) {
      alert('Erro de rede ao sincronizar.');
    }
    setSyncing(false);
  };

  const hasCredentials = !!(affiliateConfig.shopeePartnerId && affiliateConfig.shopeePartnerKey);
  const isOpen = activeAccordion === 'shopee';

  return (
    <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: isOpen ? '#fff7ed' : '#fff' }}
      onClick={() => setActiveAccordion(isOpen ? '' : 'shopee')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🛍️ Shopee (API Oficial)</h3>
          {hasCredentials ? (
            <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Configurado</span>
          ) : (
            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Não configurado</span>
          )}
          {syncStatus?.synced && (
            <span style={{ fontSize: '0.7rem', background: '#fff3d4', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {syncStatus.totalProducts} produtos {syncStatus.syncMode === 'api' ? '(API)' : '(cache)'}
            </span>
          )}
        </div>
        <span>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }} onClick={e => e.stopPropagation()}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Integração real com a <strong>Shopee Open Platform</strong>. Com ela, o sistema busca produtos reais com imagens e links 100% funcionais.
          </p>

          {/* Status da última sync */}
          {syncStatus?.synced && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.2rem', fontSize: '0.78rem', color: '#166534' }}>
              ✅ Última sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString('pt-BR') : '—'} · {syncStatus.totalProducts} produtos · Modo: {syncStatus.syncMode === 'api' ? 'API Real' : 'Cache manual'}
            </div>
          )}

          <div className="form-field">
            <label style={{ color: '#333', fontWeight: 'bold' }}>Partner ID <span style={{ fontWeight: 'normal', color: '#64748b' }}>(Shopee Open Platform)</span></label>
            <input
              type="text" placeholder="Ex: 1234567"
              style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
              value={affiliateConfig.shopeePartnerId || ''}
              onChange={e => setAffiliateConfig({ ...affiliateConfig, shopeePartnerId: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label style={{ color: '#333', fontWeight: 'bold' }}>Partner Key <span style={{ fontWeight: 'normal', color: '#64748b' }}>(chave HMAC-SHA256)</span></label>
            <input
              type="password" placeholder="Cole sua Partner Key aqui"
              style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
              value={affiliateConfig.shopeePartnerKey || ''}
              onChange={e => setAffiliateConfig({ ...affiliateConfig, shopeePartnerKey: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label style={{ color: '#333', fontWeight: 'bold' }}>Shop ID <span style={{ fontWeight: 'normal', color: '#64748b' }}>(opcional, se você também é lojista)</span></label>
            <input
              type="text" placeholder="Deixe em branco se for só afiliado"
              style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
              value={affiliateConfig.shopeeShopId || ''}
              onChange={e => setAffiliateConfig({ ...affiliateConfig, shopeeShopId: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label style={{ color: '#333', fontWeight: 'bold' }}>ID de Afiliado <span style={{ fontWeight: 'normal', color: '#64748b' }}>(aparece nos links, ex: AF12345)</span></label>
            <input
              type="text" placeholder="Ex: AF12345 ou seu username"
              style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
              value={affiliateConfig.shopeeId || ''}
              onChange={e => setAffiliateConfig({ ...affiliateConfig, shopeeId: e.target.value })}
            />
          </div>

          {/* Guia de como obter as credentials */}
          <div style={{ background: '#fff7ed', padding: '15px', borderRadius: '10px', border: '1px solid #fed7aa', margin: '1rem 0' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Como obter suas credenciais
            </h4>
            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#9a3412', lineHeight: '1.8' }}>
              <li>Acesse <strong>open.shopee.com</strong> e faça login com sua conta Shopee</li>
              <li>Clique em <strong>"Apply to be a partner"</strong> (ou "Aplicar como parceiro")</li>
              <li>Preencha o formulário com dados do seu site <strong>pegaessapromo.com.br</strong></li>
              <li>Após aprovação, vá em <strong>My Apps → App Management</strong></li>
              <li>Copie o <strong>Partner ID</strong> e a <strong>Partner Key</strong> e cole aqui</li>
            </ol>
            <button
              style={{ marginTop: '12px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
              onClick={() => window.open('https://open.shopee.com/', '_blank')}
            >
              🔗 Acessar Shopee Open Platform
            </button>
          </div>

          {/* Sync button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '1.2rem' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, backgroundColor: '#ea580c', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1 }}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Produtos Agora'}
            </button>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
            Sem credenciais, o sistema usa o catálogo curado local (12 produtos). Com credenciais, busca produtos reais da Shopee com imagens e links 100% funcionais.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'bots' | 'categories' | 'pools' | 'offers' | 'coupons'>('offers');
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<Platform>('amazon');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({});
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // WhatsApp Bot State
  const [botStatus, setBotStatus] = useState<BotStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [wpGroups, setWpGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeBotTab, setActiveBotTab] = useState<'connection' | 'groups' | 'logs'>('connection');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [forceRestarting, setForceRestarting] = useState(false);
  
  // Bot Schedule Config State
  const [intervalVal, setIntervalVal] = useState(60);
  const [maxPosts, setMaxPosts] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('19:00');
  const [template, setTemplate] = useState<'aida' | 'pas' | 'bab'>('aida');
  
  const [affiliateConfig, setAffiliateConfig] = useState({ 
    amazonId: 'andercleipino-20',
    amazonAccessKey: 'amzn1.application-oa2-client.27e8dc0d2d1d48b29a171860cf840a12',
    amazonSecretKey: 'amzn1.oa2-cs.v1.b69c917a94b07978ac42e9a484a4728ce6c7461afe375491a4701179795bb397a',
    shopeeId: '',
    shopeePartnerId: '',
    shopeePartnerKey: '',
    shopeeShopId: '',
    shopeeShopToken: '',
    aliexpressId: '',
    mercadolivreId: '', 
    mercadolivreAppId: '',
    mercadolivreClientSecret: '',
    lomadeeId: '',
    awinId: '',
    rakutenId: '',
    geminiKey: '',
    siteUrl: 'https://pegaessapromo.com.br',
    copyStyle: 'Copys bem humoradas, criativas, com emojis e gatilhos de urgência.',
    aiProvider: 'gemini' as 'gemini' | 'ollama',
    ollamaModel: '',
    forbiddenWords: 'cabo, adaptador, fone com fio, fone intra-auricular com fio, capinha, película, carregador de parede',
    igAccountId: '',
    igAccessToken: '',
    enabledSources: { amazon: true, mercadolivre: false, shopee: false, magalu: true } as { amazon?: boolean; mercadolivre?: boolean; shopee?: boolean; magalu?: boolean }
  });
  const [saveStatus, setSaveStatus] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('amazon');
  
  // Categories State
  const [dbCategories, setDbCategories] = useState<{id: string, label: string, amazonSlug?: string, shopeeSlug?: string, mlCategoryId?: string}[]>([]);
  const [newCategory, setNewCategory] = useState({ id: '', label: '', amazonSlug: '', shopeeSlug: '', mlCategoryId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmazonSlug, setEditAmazonSlug] = useState('');
  const [editShopeeSlug, setEditShopeeSlug] = useState('');
  const [editMlCategoryId, setEditMlCategoryId] = useState('');

  // Pools State
  const [pools, setPools] = useState<GroupPool[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // Offers State
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [savingPromo, setSavingPromo] = useState<string | null>(null);
  const [generatingCopyFor, setGeneratingCopyFor] = useState<string | null>(null);
  const [expandedCopy, setExpandedCopy] = useState<string | null>(null);

  const startEditing = (cat: any) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditAmazonSlug(cat.amazonSlug || '');
    setEditShopeeSlug(cat.shopeeSlug || '');
    setEditMlCategoryId(cat.mlCategoryId || '');
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
        setNewCategory({ id: '', label: '', amazonSlug: '', shopeeSlug: '', mlCategoryId: '' });
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          label: editLabel, 
          amazonSlug: editAmazonSlug,
          shopeeSlug: editShopeeSlug,
          mlCategoryId: editMlCategoryId
        })
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

  // --- Pools Actions ---
  const fetchPools = async () => {
    setLoadingPools(true);
    try {
      const res = await fetch('/api/bots/groups');
      const data = await res.json();
      if (data.success) setPools(data.pools);
    } catch (e) { console.error(e); }
    setLoadingPools(false);
  };

  const handleCreatePool = async (category: string) => {
    try {
      const res = await fetch('/api/bots/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createPool', payload: { category } })
      });
      if (res.ok) fetchPools();
    } catch (e) { console.error(e); }
  };

  const handleAddGroupToPool = async (poolId: string, groupData: any) => {
    try {
      const res = await fetch('/api/bots/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addGroup', payload: { poolId, group: groupData } })
      });
      if (res.ok) fetchPools();
    } catch (e) { console.error(e); }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Excluir este gerenciador de links? Todos os dados dele serão perdidos.')) return;
    try {
      const res = await fetch('/api/bots/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePool', payload: { poolId } })
      });
      const data = await res.json();
      if (data.success) {
        fetchPools();
      } else {
        alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (e) { 
      console.error(e);
      alert('Erro de rede ao tentar excluir.');
    }
  };

  const handleRemoveGroupFromPool = async (poolId: string, groupId: string) => {
    if (!confirm('Remover este grupo do redirecionamento?')) return;
    try {
      const res = await fetch('/api/bots/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeGroup', payload: { poolId, groupId } })
      });
      if (res.ok) fetchPools();
    } catch (e) { console.error(e); }
  };

  const handleUpdateGroupStats = async (poolId: string, groupId: string, updates: Partial<PoolGroup>) => {
    try {
      await fetch('/api/bots/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateGroup', payload: { poolId, groupId, updates } })
      });
      fetchPools();
    } catch (e) { console.error(e); }
  };

  // --- Offers Actions ---
  const [offerFilter, setOfferFilter] = useState<string>('all');  // 'all' | 'amazon' | 'mercadolivre' | 'shopee'
  const [allOffers, setAllOffers] = useState<any[]>([]);  // Master list with ALL platforms

  // Helper: merge new products into the master list, deduplicating by id
  // Ordenação: mais recentes primeiro, depois por maior desconto
  const sortOffers = (items: any[]) => {
    return items.sort((a: any, b: any) => {
      // 1. Mais recentes primeiro
      const timeA = a._fetchedAt ? new Date(a._fetchedAt).getTime() : 0;
      const timeB = b._fetchedAt ? new Date(b._fetchedAt).getTime() : 0;
      if (Math.abs(timeB - timeA) > 60000) return timeB - timeA; // Diferença > 1min = priorizar recente
      // 2. Dentro do mesmo lote, maior desconto primeiro
      return (b.discount || 0) - (a.discount || 0);
    });
  };

  const mergeOffers = (newProducts: any[], platform: string) => {
    setAllOffers(prev => {
      const existingIds = new Set(prev.filter((p: any) => p.platform !== platform).map((p: any) => p.id));
      const unique = newProducts.filter((p: any) => !existingIds.has(p.id));
      const withoutPlatform = prev.filter((p: any) => p.platform !== platform);
      return sortOffers([...withoutPlatform, ...unique]);
    });
    setOffers(prev => {
      const withoutPlatform = prev.filter((p: any) => p.platform !== platform);
      return sortOffers([...withoutPlatform, ...newProducts]);
    });
  };

  const fetchOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch('/api/amazon?category=todos');
      const data = await res.json();
      
      const uniqueIds = new Set<string>();
      const products = (data.products || [])
        .filter((p: any) => {
          if (!p.id || p.price <= 0) return false;
          if (uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        })
        .sort((a: any, b: any) => (b.discount || 0) - (a.discount || 0))
        .slice(0, 30)
        .map((p: any) => {
          const price = p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const disc = p.discount && p.discount > 0 ? ` com ${p.discount}% OFF` : '';
          const copy = `🚨 *OFERTA IMPERDÍVEL${disc}!*\n\n*${p.title}*\n\n💰 *${price}*\n⭐ ${(p.rating||0).toFixed(1)} (${p.reviews||0} avaliações)\n📦 +${(p.sales||0).toLocaleString('pt-BR')} vendidos\n${p.freeShipping ? '🚚 *FRETE GRÁTIS*\n' : ''}\n👇 Link no site`;
          return { ...p, platform: 'amazon', _copy: copy, _fetchedAt: new Date().toISOString() };
        });
      mergeOffers(products, 'amazon');
    } catch (e) { console.error(e); }
    setLoadingOffers(false);
  };

  const fetchOffersML = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch('/api/mercadolivre?category=todos&type=super');
      const data = await res.json();
      
      const uniqueIds = new Set<string>();
      const products = (data.products || [])
        .filter((p: any) => {
          if (!p.id || p.price <= 0) return false;
          if (uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        })
        .sort((a: any, b: any) => (b.discount || 0) - (a.discount || 0))
        .slice(0, 30)
        .map((p: any) => {
          const price = p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const disc = p.discount && p.discount > 0 ? ` com ${p.discount}% OFF` : '';
          const copy = `💛 *NOVIDADE MERCADO LIVRE${disc}!*\n\n*${p.title}*\n\n💰 *${price}*\n⚡ Envio Imediato Full\n${p.freeShipping ? '🚚 *FRETE GRÁTIS*\n' : ''}\n👇 Link no site`;
          return { ...p, platform: 'mercadolivre', _copy: copy, _fetchedAt: new Date().toISOString() };
        });
      mergeOffers(products, 'mercadolivre');
      if (products.length === 0) {
        const msg = data.message || 'Nenhuma oferta encontrada';
        const details = data.details ? JSON.stringify(data.details) : '';
        alert(`❌ Erro Mercado Livre: ${msg}\n${details}`);
      }
    } catch (e: any) { alert('Falha ao conectar com a API: ' + e.message); }
    setLoadingOffers(false);
  };

  const fetchOffersShopee = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch('/api/shopee?category=todos');
      const data = await res.json();
      
      const uniqueIds = new Set<string>();
      const products = (data.products || [])
        .filter((p: any) => {
          if (!p.id || p.price <= 0) return false;
          if (uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        })
        .sort((a: any, b: any) => (b.discount || 0) - (a.discount || 0))
        .slice(0, 30)
        .map((p: any) => {
          const price = p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const disc = p.discount && p.discount > 0 ? ` com ${p.discount}% OFF` : '';
          const copy = `🛍️ *SHOPEE${disc}!*\n\n*${p.title}*\n\n💰 *${price}*\n${p.freeShipping ? '🚚 *FRETE GRÁTIS*\n' : ''}\n👇 Link no site`;
          return { ...p, platform: 'shopee', _copy: copy, _fetchedAt: new Date().toISOString() };
        });
      mergeOffers(products, 'shopee');
    } catch (e) { console.error(e); }
    setLoadingOffers(false);
  };

  const fetchOffersMagalu = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch('/api/magalu?category=eletronicos');
      const data = await res.json();
      
      const uniqueIds = new Set<string>();
      const products = (data.products || [])
        .filter((p: any) => {
          if (!p.id || p.price <= 0) return false;
          if (uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        })
        .sort((a: any, b: any) => (b.discount || 0) - (a.discount || 0))
        .slice(0, 30)
        .map((p: any) => {
          const price = p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const disc = p.discount && p.discount > 0 ? ` com ${p.discount}% OFF` : '';
          const copy = `🟣 *MAGALU${disc}!*\n\n*${p.title}*\n\n💰 *${price}*\n${p.freeShipping ? '🚚 *FRETE GRÁTIS*\n' : ''}\n👇 Link no site`;
          return { ...p, platform: 'magalu', _copy: copy, _fetchedAt: new Date().toISOString() };
        });
      mergeOffers(products, 'magalu');
    } catch (e) { console.error(e); }
    setLoadingOffers(false);
  };

  // Busca TODAS as plataformas ativas em paralelo
  const fetchAllOffers = async () => {
    const sources = affiliateConfig.enabledSources || { amazon: true, mercadolivre: true, shopee: true, magalu: true };
    const promises: Promise<void>[] = [];
    if (sources.amazon !== false) promises.push(fetchOffers());
    if (sources.mercadolivre !== false) promises.push(fetchOffersML());
    if (sources.magalu !== false) promises.push(fetchOffersMagalu());
    if (sources.shopee !== false) promises.push(fetchOffersShopee());
    await Promise.allSettled(promises);
  };

  const handleSendOffer = async (product: any) => {
    if (selectedGroups.length === 0) {
      alert('Selecione ao menos um grupo na aba "Config Bot" → "Grupos Automáticos"');
      return;
    }
    if (botStatus !== 'connected') {
      alert('O robô precisa estar conectado. Vá na aba "Config Bot" → "Conexão".');
      return;
    }
    setSendingOffer(product.id);
    try {
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-now',
          groups: selectedGroups,
          affiliateConfig,
          // Pass only this specific product (override the scheduler's product selection)
          singleProduct: product,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Oferta "${product.title.substring(0, 50)}..." enviada com sucesso!`);
      } else {
        alert('Erro ao enviar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro de rede ao enviar a oferta.');
    }
    setSendingOffer(null);
  };

  const handleBanProduct = async (product: any) => {
    const keyword = window.prompt(`🚫 Banir esse tipo de produto para sempre do robô.\n\nQual palavra-chave curta do nome "${product.title.substring(0, 30)}..." você quer bloquear?\n\nExemplo: cabo, capinha, fone com fio, prato`);
    if (!keyword || keyword.trim() === '') return;
    
    // Add to forbiddenWords config
    const currentForbidden = affiliateConfig.forbiddenWords ? affiliateConfig.forbiddenWords : 'cabo, adaptador, fone com fio, fone intra-auricular com fio, capinha, película, carregador de parede';
    const newForbiddenWords = currentForbidden + ', ' + keyword.trim().toLowerCase();
    
    const newConfig = { ...affiliateConfig, forbiddenWords: newForbiddenWords };
    setAffiliateConfig(newConfig);
    localStorage.setItem('affiliateConfig', JSON.stringify(newConfig));
    
    try {
      // Sync settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      // Delete from DB cache
      await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban-product', productId: product.id })
      });
      
      // Remove from UI
      setOffers(prev => prev.filter(o => o.id !== product.id));
      alert(`✅ A palavra "${keyword}" foi adicionada à Lista Negra e este produto foi apagado do seu painel e do seu site.`);
    } catch(e) {
      alert('Aconteceu um erro ao tentar banir o produto.');
    }
  };

  const handleStandbyOffer = async (product: any) => {
    setSavingPromo(product.id);
    try {
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'standby-now',
          affiliateConfig,
          singleProduct: product,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✨ ${data.message || 'Adicionado com sucesso!'}`);
      } else {
        alert('Erro ao processar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro de rede ao salvar no site.');
    }
    setSavingPromo(null);
  };

  const handleGenerateCopyOnly = async (product: any) => {
    setGeneratingCopyFor(product.id);
    try {
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-copy-only',
          affiliateConfig,
          singleProduct: product,
          config: { template }
        })
      });
      const data = await res.json();
      if (data.success && data.creativeCopy) {
        // Update local state with the newly generated copy so it displays immediately
        setOffers(prevOffers => prevOffers.map(o => o.id === product.id ? { ...o, creativeCopy: data.creativeCopy } : o));
      } else {
        alert('Erro ao gerar copy: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro de rede ao conectar à IA.');
    }
    setGeneratingCopyFor(null);
  };

  // --- WhatsApp Bot Actions ---
  const handleStartBot = async () => {
    setBotStatus('connecting');
    setQrCode(null);
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

  const handleForceRestart = async () => {
    if (!confirm('Isso vai encerrar o processo do Chrome/Puppeteer e reiniciar o bot. Continuar?')) return;
    setForceRestarting(true);
    setBotStatus('connecting');
    setQrCode(null);
    try {
      const res = await fetch('/api/bots/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-restart' })
      });
      const data = await res.json();
      if (data.state) {
        setBotStatus(data.state.status);
        setQrCode(data.state.qrCode);
      }
      alert(data.message || 'Bot reiniciado! Aguarde o QR Code aparecer.');
    } catch (e) {
      setBotStatus('error');
      console.error(e);
      alert('Erro ao tentar reiniciar o bot.');
    }
    setForceRestarting(false);
  };

  const handleClearSession = async () => {
    if (!confirm('Isso vai resetar seu WhatsApp no bot e você precisará ler o QR Code de novo. Confirmar?')) return;
    setForceRestarting(true);
    setBotStatus('connecting');
    setQrCode(null);
    try {
      const res = await fetch('/api/bots/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-session' })
      });
      const data = await res.json();
      if (data.state) {
        setBotStatus(data.state.status);
        setQrCode(data.state.qrCode);
      }
      alert(data.message || 'Sessão limpa.');
    } catch (e) {
      setBotStatus('error');
      console.error(e);
      alert('Erro ao tentar limpar a sessão.');
    }
    setForceRestarting(false);
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
      
      if (schData.config) {
        if (schData.config.intervalMinutes) setIntervalVal(schData.config.intervalMinutes);
        if (schData.config.maxPostsPerRun) setMaxPosts(schData.config.maxPostsPerRun);
        if (schData.config.startTime) setStartTime(schData.config.startTime);
        if (schData.config.endTime) setEndTime(schData.config.endTime);
        if (schData.config.template) setTemplate(schData.config.template);
      }
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
          affiliateConfig,
          config: {
            intervalMinutes: intervalVal,
            maxPostsPerRun: maxPosts,
            startTime,
            endTime,
            template,
            platforms: { whatsapp: true, instagram: true }
          }
        })
      });
      if (res.ok) setScheduleEnabled(!scheduleEnabled);
    } catch (e) { console.error(e); }
  };

  const handleSaveBotConfig = async () => {
    try {
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'configure', 
          groups: selectedGroups,
          affiliateConfig,
          config: {
            intervalMinutes: intervalVal,
            maxPostsPerRun: maxPosts,
            startTime,
            endTime,
            template,
            platforms: { whatsapp: true, instagram: true }
          }
        })
      });
      if (res.ok) {
        alert('Configurações do Robô salvas com sucesso!');
      }
    } catch (e) { console.error(e); }
  };

  const handleRunNow = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'run-now', 
          groups: selectedGroups,
          affiliateConfig,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ciclo de postagem iniciado manualmente!');
        syncBotState();
      }
    } catch (e) { 
      console.error(e);
      alert('Erro ao tentar postar agora.');
    }
    setLoadingGroups(false);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };



  useEffect(() => {
    setMounted(true);
    syncBotState();
    const interval = setInterval(syncBotState, 5000);
    
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const cloudConfig = await res.json();
          if (cloudConfig && Object.keys(cloudConfig).length > 0) {
            setAffiliateConfig(prev => ({ ...prev, ...cloudConfig }));
            setConfigLoaded(true);
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
              siteUrl: parsed.siteUrl || 'https://pegaessapromo.com.br',
              copyStyle: parsed.copyStyle || 'Copys bem humoradas, criativas, com emojis e gatilhos de urgência.'
            })); 
          } catch {}
      }
      setConfigLoaded(true);
    };

    loadConfig();
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(console.error);

    return () => clearInterval(interval);
  }, [activePlatform, syncBotState]);

  // Aguarda as configurações carregarem antes de buscar ofertas
  useEffect(() => {
    if (activeTab === 'pools') fetchPools();
    if (activeTab === 'offers' && offers.length === 0 && configLoaded) fetchAllOffers();
  }, [activeTab, configLoaded]);

  
  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) setCoupons(await res.json());
    } catch(e) {}
  };
  
  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount || !newCoupon.store || !newCoupon.link) {
      alert('Preencha código, desconto, loja e link do cupom!');
      return;
    }
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon)
      });
      if (res.ok) {
        setNewCoupon({});
        fetchCoupons();
      }
    } catch(e) {}
  };
  
  const handleDeleteCoupon = async (id: string) => {
    if(confirm('Excluir cupom?')) {
      await fetch('/api/coupons?id=' + id, { method: 'DELETE' });
      fetchCoupons();
    }
  };

  useEffect(() => {
    if (activeTab === 'coupons') fetchCoupons();
  }, [activeTab]);

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
        <div className="admin-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', width: '100%', overflowX: 'auto' }}>
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
          <button 
            onClick={() => setActiveTab('pools')}
            className={`admin-tab ${activeTab === 'pools' ? 'active' : ''}`}
          >
            🔗 Links Inteligentes
          </button>
          <button 
            onClick={() => { setActiveTab('offers'); if (offers.length === 0) fetchAllOffers(); }}
            className={`admin-tab ${activeTab === 'offers' ? 'active' : ''}`}
          >
            📦 Ofertas
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            style={{ marginLeft: '10px' }}
          >
            ⚙️ Configurações
          </button>

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', padding: '0 15px', 
            background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', height: '36px' 
          }}>
             <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: botStatus === 'connected' ? '#22c55e' : (botStatus === 'qr_ready' ? '#eab308' : '#ef4444') }}>
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`admin-tab ${activeTab === 'coupons' ? 'active' : ''}`}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'coupons' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: activeTab === 'coupons' ? '600' : '400', borderRadius: '0.5rem', color: '#1e293b' }}
          >
            🎟️ Cupons
          </button>
</div>
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap' }}>
               {botStatus === 'connected' ? 'Zap Conectado' : (botStatus === 'qr_ready' ? 'Aguardando QR' : 'Zap Desconectado')}
             </span>
          </div>
        </div>




        {activeTab === 'settings' && (
          <section className="settings-section">
            <div className="admin-header-row" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-title-section">
                <h2>⚙️ Configurações do Sistema</h2>
                <p>Gerencie suas chaves de afiliado e integrações com Inteligência Artificial.</p>
              </div>
            </div>


            {/* ── Fontes de Ofertas ── */}
            <div className="admin-card" style={{ marginBottom: '1.5rem', border: '2px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>🔌 Fontes de Ofertas Ativas</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.2rem' }}>
                Ative ou desative de qual plataforma o robô vai buscar ofertas. Desative as que não estão funcionando.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'amazon',        label: '🛒 Amazon',         color: '#f59e0b' },
                  { key: 'mercadolivre',  label: '🤝 Mercado Livre',  color: '#fbbf24' },
                  { key: 'magalu',        label: '🟣 Magalu',         color: '#8b5cf6' },
                  { key: 'shopee',        label: '🛍️ Shopee',         color: '#f97316' },
                ].map(({ key, label, color }) => {
                  const enabled = affiliateConfig.enabledSources?.[key as 'amazon' | 'mercadolivre' | 'shopee' | 'magalu'] !== false;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const current = affiliateConfig.enabledSources || { amazon: true, mercadolivre: true, shopee: true };
                        setAffiliateConfig({ ...affiliateConfig, enabledSources: { ...current, [key]: !enabled } });
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 18px', borderRadius: '50px', cursor: 'pointer', border: '2px solid',
                        borderColor: enabled ? color : '#e2e8f0',
                        background: enabled ? `${color}18` : '#f8fafc',
                        fontWeight: 'bold', fontSize: '0.88rem', color: enabled ? '#1e293b' : '#94a3b8',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: enabled ? color : '#cbd5e1',
                        boxShadow: enabled ? `0 0 6px ${color}` : 'none',
                        transition: 'all 0.2s'
                      }} />
                      {label}
                      <span style={{ fontSize: '0.72rem', fontWeight: 'normal', color: enabled ? color : '#94a3b8' }}>
                        {enabled ? 'ATIVO' : 'DESATIVADO'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-card" style={{ cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'amazon' ? '#fffbeb' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'amazon' ? '' : 'amazon')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🛒 Amazon (Afiliados)</h3>
                   {affiliateConfig.amazonId && affiliateConfig.amazonAccessKey ? (
                     <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Online</span>
                   ) : (
                     <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Incompleto</span>
                   )}
                 </div>
                 <span>{activeAccordion === 'amazon' ? '▲' : '▼'}</span>
               </div>
               
               {activeAccordion === 'amazon' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
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
               )}
            </div>

            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'mercadolivre' ? '#fef08a' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'mercadolivre' ? '' : 'mercadolivre')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🤝 Mercado Livre (API Oficial)</h3>
                   {affiliateConfig.mercadolivreAppId && affiliateConfig.mercadolivreClientSecret ? (
                     <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Online</span>
                   ) : (
                     <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Incompleto</span>
                   )}
                 </div>
                 <span>{activeAccordion === 'mercadolivre' ? '▲' : '▼'}</span>
               </div>

               {activeAccordion === 'mercadolivre' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                   <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                     Suas credenciais recém-criadas no Mercado Livre Developers. Elas desbloqueiam a busca imune a bloqueios.
                   </p>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Application ID (App ID ou Client ID)</label>
                      <input 
                        type="text" placeholder="Ex: 85938481923..."
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                        value={affiliateConfig.mercadolivreAppId || ''}
                        onChange={e => setAffiliateConfig({...affiliateConfig, mercadolivreAppId: e.target.value})}
                      />
                   </div>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Chave Secreta (Client Secret)</label>
                      <input 
                        type="password" placeholder="Cole sua Client Secret gerada no painel"
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                        value={affiliateConfig.mercadolivreClientSecret || ''}
                        onChange={e => setAffiliateConfig({...affiliateConfig, mercadolivreClientSecret: e.target.value})}
                      />
                   </div>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Sua Tag de Afiliado (Ex: seu-id-20)</label>
                      <input 
                        type="text" placeholder="Use se for gerar deep-link de afiliados manual"
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                        value={affiliateConfig.mercadolivreId || ''}
                        onChange={e => setAffiliateConfig({...affiliateConfig, mercadolivreId: e.target.value})}
                      />
                   </div>
                   <div style={{ background: '#fefce8', padding: '15px', borderRadius: '10px', border: '1px solid #fef08a', marginTop: '1rem' }}>
                       <h4 style={{ margin: '0 0 10px 0', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         🔑 Autenticação Necessária
                       </h4>
                       <p style={{ fontSize: '0.8rem', color: '#854d0e', marginBottom: '15px' }}>
                          O Mercado Livre exige que você autorize este aplicativo para permitir buscas sem bloqueios.
                        </p>
                        <p style={{ fontSize: '0.65rem', color: '#854d0e', background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #fde68a', marginBottom: '15px' }}>
                          1. No painel do ML, defina a <b>Redirect URI</b> como:<br />
                          <code>https://pegaessapromo.app.br/api/mercadolivre/callback</code>
                          <br /><br />
                          2. Marque as caixas <b>Authorization Code</b> e <b>Refresh Token</b>.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <button 
                            className="btn btn-primary"
                            style={{ backgroundColor: '#2563eb', border: 'none', flex: 1, cursor: 'pointer' }}
                            onClick={() => {
                              if (!affiliateConfig.mercadolivreAppId) {
                                alert('Preencha o App ID primeiro!');
                                return;
                              }
                              const redirectUri = `https://pegaessapromo.app.br/api/mercadolivre/callback`;
                              const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${affiliateConfig.mercadolivreAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=offline_access%20read%20write`;
                              window.open(authUrl, '_blank');
                            }}
                          >
                            🔓 Autorizar (Via Site Real)
                          </button>
                          <button 
                            className="btn btn-secondary"
                            style={{ backgroundColor: '#64748b', color: 'white', flex: 1, cursor: 'pointer', fontSize: '0.7rem' }}
                            onClick={() => {
                              if (!affiliateConfig.mercadolivreAppId) {
                                alert('Preencha o App ID primeiro!');
                                return;
                              }
                              const redirectUri = `${window.location.origin}/api/mercadolivre/callback`;
                              const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${affiliateConfig.mercadolivreAppId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
                                `&scope=offline_access%20read%20write`;
                              window.open(authUrl, '_blank');
                            }}
                          >
                             Autorizar (Local)
                          </button>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '10px', textAlign: 'center' }}>
                          *Ao usar o Site Real, o login será salvo no banco compartilhado e ativado aqui no seu PC na hora!
                        </p>
                     </div>
                  </div>
                )}
             </div>

            {/* ── Shopee Open API ── */}
            <ShopeeApiAccordion
              affiliateConfig={affiliateConfig}
              setAffiliateConfig={setAffiliateConfig}
              activeAccordion={activeAccordion}
              setActiveAccordion={setActiveAccordion}
            />

            {/* ── Magalu ── */}
            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'magalu' ? '#f5f3ff' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'magalu' ? '' : 'magalu')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🟣 Magazine Luiza (Magalu)</h3>
                   <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Automático</span>
                 </div>
                 <span>{activeAccordion === 'magalu' ? '▲' : '▼'}</span>
               </div>

               {activeAccordion === 'magalu' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }} onClick={e => e.stopPropagation()}>
                   <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                     O Magalu funciona <strong>automaticamente</strong> — não precisa de credenciais. O sistema extrai produtos reais diretamente do site magazineluiza.com.br.
                   </p>

                   <div style={{ background: '#f5f3ff', padding: '15px', borderRadius: '10px', border: '1px solid #ddd6fe', marginBottom: '1rem' }}>
                     <h4 style={{ margin: '0 0 10px 0', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       ✅ Como funciona
                     </h4>
                     <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#6d28d9', lineHeight: '1.8' }}>
                       <li>Busca produtos reais do site da Magazine Luiza</li>
                       <li>Preços, títulos e imagens são extraídos diretamente da página</li>
                       <li>Cache automático de 2 horas para performance</li>
                       <li>Produtos exibidos com o selo Magalu no site e ofertas</li>
                     </ul>
                   </div>

                   <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                     💡 Para desativar o Magalu, use o botão "Fontes de Ofertas Ativas" acima.
                   </p>
                 </div>
               )}
            </div>

            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'ia' ? '#f0fdf4' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'ia' ? '' : 'ia')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🤖 Inteligência Artificial (Copys)</h3>
                   {(affiliateConfig.aiProvider === 'ollama' && affiliateConfig.ollamaModel) || (affiliateConfig.aiProvider === 'gemini' && affiliateConfig.geminiKey) || (!affiliateConfig.aiProvider && affiliateConfig.geminiKey) ? (
                     <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Online</span>
                   ) : (
                     <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🔴 Incompleto</span>
                   )}
                 </div>
                 <span>{activeAccordion === 'ia' ? '▲' : '▼'}</span>
               </div>
               
               {activeAccordion === 'ia' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                   <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                     A chave do Gemini é usada para gerar as copys altamente persuasivas para seus grupos automaticamente.
                   </p>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Provedor de IA (Cérebro do Robô)</label>
                      <select
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px', borderRadius: '4px', marginBottom: '8px', width: '100%' }}
                        value={affiliateConfig.aiProvider || 'gemini'}
                        onChange={e => setAffiliateConfig({...affiliateConfig, aiProvider: e.target.value as 'gemini' | 'ollama'})}
                      >
                        <option value="gemini">Google Gemini (Grátis / Tem limites de uso)</option>
                        <option value="ollama">Ollama (Local / Roda na sua placa de vídeo / Sem limites)</option>
                      </select>
                   </div>
                   
                   {(!affiliateConfig.aiProvider || affiliateConfig.aiProvider === 'gemini') ? (
                     <div className="form-field">
                        <label style={{ color: '#333', fontWeight: 'bold' }}>Google Gemini API Key</label>
                        <input 
                          type="password" placeholder="Cole sua chave do AI Studio aqui"
                          style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                          value={affiliateConfig.geminiKey}
                          onChange={e => setAffiliateConfig({...affiliateConfig, geminiKey: e.target.value})}
                        />
                     </div>
                   ) : (
                     <div className="form-field" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <label style={{ color: '#333', fontWeight: 'bold' }}>Nome do Modelo no Ollama</label>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                          Digite exatamente como você baixou no Ollama (ex: <code>llama3.2</code>, <code>phi3</code>, <code>mistral</code>)
                        </p>
                        <input 
                          type="text" placeholder="ex: llama3.2"
                          style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                          value={affiliateConfig.ollamaModel || ''}
                          onChange={e => setAffiliateConfig({...affiliateConfig, ollamaModel: e.target.value})}
                        />
                     </div>
                   )}
                   
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Estilo das Copys (IA)</label>
                      <textarea 
                        placeholder="Ex: Copys engraçadas, usando gírias, focando em economia..."
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', minHeight: '80px', paddingTop: '10px' }}
                        value={affiliateConfig.copyStyle}
                        onChange={e => setAffiliateConfig({...affiliateConfig, copyStyle: e.target.value})}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>
                        Descreva como você quer que o Gemini escreva suas ofertas (humor, urgência, tom de voz, etc).
                      </p>
                   </div>
                 </div>
               )}
            </div>

            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'instagram' ? '#fdf4ff' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'instagram' ? '' : 'instagram')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>📸 Integração Instagram (API Graph)</h3>
                   {affiliateConfig.igAccountId && affiliateConfig.igAccessToken ? (
                     <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🟢 Online</span>
                   ) : (
                     <span style={{ fontSize: '0.7rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>⚪ Inativo</span>
                   )}
                 </div>
                 <span>{activeAccordion === 'instagram' ? '▲' : '▼'}</span>
               </div>
               
               {activeAccordion === 'instagram' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                   <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                     Para postar direto no Instagram sem ferramentas piratas, use tokens da API Oficial "Facebook for Developers".
                   </p>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Instagram Account ID (ig_user_id)</label>
                      <input 
                        type="text" placeholder="ID da sua conta Instagram vinculada"
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                        value={affiliateConfig.igAccountId || ''}
                        onChange={e => setAffiliateConfig({...affiliateConfig, igAccountId: e.target.value})}
                      />
                   </div>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Access Token (Longo Prazo)</label>
                      <input 
                        type="password" placeholder="Token gerado no painel de Sistema da Meta"
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }}
                        value={affiliateConfig.igAccessToken || ''}
                        onChange={e => setAffiliateConfig({...affiliateConfig, igAccessToken: e.target.value})}
                      />
                   </div>
                 </div>
               )}
            </div>

            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'blacklist' ? '#fef2f2' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'blacklist' ? '' : 'blacklist')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🛡️ Lista Negra (Palavras Proibidas)</h3>
                 <span>{activeAccordion === 'blacklist' ? '▲' : '▼'}</span>
               </div>
               
               {activeAccordion === 'blacklist' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                   <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                     Qualquer produto que tenha essas palavras no nome será <b>instantaneamente descartado</b> pelo robô e não chegará ao seu painel.
                   </p>
                   <div className="form-field">
                      <label style={{ color: '#333', fontWeight: 'bold' }}>Palavras separadas por VÍRGULA</label>
                      <textarea 
                        placeholder="Ex: cabo, filme, capa, película, adaptador..."
                        style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', minHeight: '60px', paddingTop: '10px' }}
                        value={affiliateConfig.forbiddenWords || 'cabo, adaptador, fone com fio, fone intra-auricular com fio, capinha, película, carregador de parede'}
                        onChange={e => setAffiliateConfig({...affiliateConfig, forbiddenWords: e.target.value})}
                      />
                   </div>
                 </div>
               )}
            </div>

            <div className="admin-card" style={{ marginTop: '1rem', cursor: 'pointer', padding: '15px 25px', backgroundColor: activeAccordion === 'portal' ? '#f3f4f6' : '#fff' }} onClick={() => setActiveAccordion(activeAccordion === 'portal' ? '' : 'portal')}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>🌐 Configurações do Portal</h3>
                 <span>{activeAccordion === 'portal' ? '▲' : '▼'}</span>
               </div>
               
               {activeAccordion === 'portal' && (
                 <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
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
                      {mounted && affiliateConfig.siteUrl?.includes('pegaessapromo.com.br') && window.location.hostname === 'localhost' && (
                        <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.8rem' }}>
                          ⚠️ <b>CUIDADO:</b> Você está usando a URL de produção (pegaessapromo.com.br) enquanto o sistema roda localmente.
                          Isso fará com que os links nas mensagens deem <b>Erro 404</b> ao serem clicados, pois o site de produção não conhece os dados do seu banco local.
                          Para testes, use: <code>{window.location.origin}</code> e clique em <b>Salvar Tudo</b>.
                        </div>
                      )}
                   </div>
                 </div>
               )}
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
                    <div style={{ marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleForceRestart}
                        disabled={forceRestarting}
                        title="Encerra processos travados do Chrome e reinicia o bot do zero"
                      >
                        {forceRestarting ? '⏳ Reiniciando...' : '🔧 Forçar Reinício (Processo Travado?)'}
                      </button>
                    </div>
                  </>
                )}

                {botStatus === 'connecting' && (
                  <div style={{ padding: '2rem' }}>
                    <div className="admin-loading">{forceRestarting ? 'Reiniciando processo do bot...' : 'Iniciando servidor do bot...'}</div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>Isso pode levar até 30 segundos na primeira vez.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={syncBotState}>🔄 Verificar Status</button>
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#f97316', color: 'white', border: 'none' }}
                        onClick={handleForceRestart}
                        disabled={forceRestarting}
                      >
                        {forceRestarting ? '⏳ Aguarde...' : '🔧 Forçar Reinício'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                      💡 Se ficar travado por mais de 1 minuto, use "Forçar Reinício" para matar o processo Chrome e tentar novamente.
                    </p>
                  </div>
                )}

                {botStatus === 'error' && (
                  <div style={{ padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h3>Erro ao Iniciar</h3>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Houve um problema ao carregar o WhatsApp. Tente novamente.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleStartBot}>▶️ Tentar Novamente</button>
                      <button
                        className="btn btn-secondary"
                        style={{ backgroundColor: '#f97316', color: 'white', border: 'none' }}
                        onClick={handleForceRestart}
                        disabled={forceRestarting}
                      >
                        {forceRestarting ? '⏳ Reiniciando...' : '🔧 Forçar Reinício'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                        onClick={handleClearSession}
                        disabled={forceRestarting}
                      >
                        {forceRestarting ? '⏳ Limpando...' : '🗑️ Limpar Sessão e Resetar'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                      Use "Forçar Reinício" se ficou travado. Use "Limpar Sessão e Resetar" apenas se o WhatsApp não quiser conectar de jeito nenhum.
                    </p>
                  </div>
                )}

                {botStatus === 'qr_ready' && (
                  <div>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '15px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                      <h3 style={{ marginBottom: '1rem', color: '#000' }}>Escaneie o QR Code</h3>
                      {qrCode ? (
                        <>
                          <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>Abra o WhatsApp {'>'} Aparelhos Conectados</p>
                        </>
                      ) : (
                        <div style={{ padding: '2rem' }}>
                          <div className="admin-loading">Gerando QR Code...</div>
                          <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={syncBotState}>🔄 Forçar Atualização</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#f97316', color: 'white', border: 'none' }}
                        onClick={handleForceRestart}
                        disabled={forceRestarting}
                      >
                        {forceRestarting ? '⏳ Reiniciando...' : '🔄 QR Code expirou? Forçar Reinício'}
                      </button>
                    </div>
                  </div>
                )}

                {botStatus === 'connected' && (
                   <div style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                      <h3 style={{ color: '#000' }}>Robô Conectado e Ativo!</h3>
                      <p style={{ color: '#64748b', marginBottom: '2rem' }}>O sistema está pronto para monitorar as melhores ofertas da Amazon.</p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-delete" style={{ padding: '10px 20px' }} onClick={handleStopBot}>🔌 Desconectar Aparelho</button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '10px 20px', backgroundColor: '#f97316', color: 'white', border: 'none' }}
                          onClick={handleForceRestart}
                          disabled={forceRestarting}
                        >
                          {forceRestarting ? '⏳ Reiniciando...' : '🔧 Forçar Reinício'}
                        </button>
                      </div>
                   </div>
                )}
              </div>
            )}

            {activeBotTab === 'groups' && (
              <>
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3>⚙️ Frequência e Período</h3>
                    <p style={{ fontSize: '0.85rem' }}>Configure quando e com que frequência o robô deve postar.</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleSaveBotConfig}>💾 Salvar Configurações</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div className="form-field">
                    <label style={{ color: '#333', fontWeight: 'bold' }}>Intervalo de Postagem</label>
                    <select 
                      value={intervalVal} 
                      onChange={e => setIntervalVal(Number(e.target.value))}
                      style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '8px' }}
                    >
                      <option value={15}>A cada 15 minutos</option>
                      <option value={30}>A cada 30 minutos</option>
                      <option value={60}>A cada 1 hora</option>
                      <option value={120}>A cada 2 horas</option>
                      <option value={240}>A cada 4 horas</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label style={{ color: '#333', fontWeight: 'bold' }}>Estilo de Cópia (Copy)</label>
                    <select 
                      value={template} 
                      onChange={e => setTemplate(e.target.value as any)}
                      style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '8px' }}
                    >
                      <option value="short">Curta (CTA + Direta)</option>
                      <option value="aida">AIDA (Persuasão Máxima)</option>
                      <option value="pas">PAS (Foco na Dor)</option>
                      <option value="bab">BAB (Antes/Depois)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label style={{ color: '#333', fontWeight: 'bold' }}>Produtos por Ciclo</label>
                    <select 
                      value={maxPosts} 
                      onChange={e => setMaxPosts(Number(e.target.value))}
                      style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '8px' }}
                    >
                      <option value={1}>1 produto</option>
                      <option value={2}>2 produtos</option>
                      <option value={3}>3 produtos</option>
                      <option value={5}>5 produtos</option>
                      <option value={10}>10 produtos</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label style={{ color: '#333', fontWeight: 'bold' }}>Início das Postagens</label>
                    <input 
                      type="time" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)}
                      style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="form-field">
                    <label style={{ color: '#333', fontWeight: 'bold' }}>Fim das Postagens</label>
                    <input 
                      type="time" 
                      value={endTime} 
                      onChange={e => setEndTime(e.target.value)}
                      style={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '8px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-card">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h3>Seleção de Grupos Alvo</h3>
                      <p style={{ fontSize: '0.85rem' }}>Escolha em quais grupos o robô deve postar as ofertas.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className={`btn ${scheduleEnabled ? 'btn-delete' : 'btn-primary'}`}
                        onClick={handleToggleSchedule}
                        disabled={botStatus !== 'connected' || selectedGroups.length === 0}
                        style={{ opacity: (botStatus !== 'connected' || selectedGroups.length === 0) ? 0.5 : 1 }}
                      >
                        {scheduleEnabled ? '🛑 Parar Automação' : '⚡ Ativar Postagem IA'}
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={handleRunNow}
                        disabled={botStatus !== 'connected' || selectedGroups.length === 0 || loadingGroups}
                        style={{ opacity: (botStatus !== 'connected' || selectedGroups.length === 0 || loadingGroups) ? 0.5 : 1 }}
                      >
                        🚀 Postar Agora
                      </button>
                    </div>
                 </div>

                 {botStatus !== 'connected' ? (
                   <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      Primeiro conecte o WhatsApp na aba <b>Conexão</b> para listar seus grupos.
                   </div>
                 ) : (
                   <div style={{ padding: '0 1rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#f8fafc', padding: '15px', borderRadius: '10px' }}>
                       <div>
                         <h4 style={{ margin: 0, color: '#334155' }}>Grupos Sincronizados</h4>
                         <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                           Para não travar o carregamento do robô, os grupos não são mais buscados automaticamente. 
                           Clique no botão ao lado se tiver criado um <b>novo grupo</b> recentemente.
                         </p>
                       </div>
                       <button 
                         className="btn btn-secondary btn-sm"
                         onClick={async () => {
                           if (!confirm('Buscar as dezenas de mensagens do WhatsApp pode levar alguns minutos. Deseja continuar?')) return;
                           const btn = document.getElementById('btn-sync-groups');
                           if(btn) btn.innerText = '⏳ Sincronizando...';
                           try {
                             const res = await fetch('/api/bots/whatsapp', { method: 'POST', body: JSON.stringify({ action: 'sync-groups' }) });
                             const data = await res.json();
                             if (data.groups) {
                               alert(data.groups.length + ' grupos encontrados! Eles agora estão salvos para você selecionar.');
                               window.location.reload();
                             }
                           } catch (e) {
                             alert('Falha ao sincronizar.');
                           }
                           if(btn) btn.innerText = '🔄 Sincronizar Novos Grupos do Zap';
                         }}
                         id="btn-sync-groups"
                         style={{ backgroundColor: '#0284c7', color: 'white', border: 'none' }}
                       >
                         🔄 Sincronizar Novos Grupos do Zap
                       </button>
                     </div>

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
                        {wpGroups.length === 0 && <div className="admin-loading" style={{ gridColumn: '1 / -1', padding: '2rem' }}>Nenhum grupo sincronizado. Clique no botão de buscar grupos acima para carregar pela 1ª vez.</div>}
                     </div>
                   </div>
                 )}
              </div>
            </>)}

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
                          {log.status === 'error' && log.message && (
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.message}>
                              {log.message}
                            </div>
                          )}
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

        
      {activeTab === 'coupons' && (
        <div className="settings-section" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>🎟️ Gestão de Cupons</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Loja</label>
              <select 
                value={newCoupon.store || ''} 
                onChange={e => setNewCoupon({...newCoupon, store: e.target.value as Platform})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              >
                <option value="">Selecione...</option>
                <option value="shopee">Shopee</option>
                <option value="amazon">Amazon</option>
                <option value="mercadolivre">Mercado Livre</option>
                <option value="magalu">Magalu</option>
                <option value="aliexpress">AliExpress</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Código do Cupom</label>
              <input 
                type="text" 
                placeholder="Ex: QUERO10" 
                value={newCoupon.code || ''} 
                onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Desconto (R$ ou %)</label>
              <input 
                type="text" 
                placeholder="Ex: R$ 100,00 ou 10%" 
                value={newCoupon.discount || ''} 
                onChange={e => setNewCoupon({...newCoupon, discount: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Descrição Breve (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: Válido em todo o site até sexta" 
                value={newCoupon.description || ''} 
                onChange={e => setNewCoupon({...newCoupon, description: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Link do Afiliado</label>
              <input 
                type="url" 
                placeholder="Ex: https://shopee.com.br..." 
                value={newCoupon.link || ''} 
                onChange={e => setNewCoupon({...newCoupon, link: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              />
            </div>
          </div>
          
          <button 
            onClick={handleAddCoupon}
            style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '500', cursor: 'pointer' }}
          >
            Adicionar Cupom
          </button>

          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '3rem', marginBottom: '1rem', color: '#1e293b' }}>Cupons Ativos</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {coupons.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                <div>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#e2e8f0', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginRight: '0.5rem' }}>{c.store}</span>
                  <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>{c.code}</strong>
                  <span style={{ margin: '0 0.5rem', color: '#64748b' }}>-</span>
                  <strong style={{ color: '#10b981' }}>{c.discount}</strong>
                  {c.description && <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{c.description}</p>}
                </div>
                <div>
                  <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none', marginRight: '1rem' }}>Testar Link</a>
                  <button onClick={() => handleDeleteCoupon(c.id)} style={{ padding: '0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Excluir</button>
                </div>
              </div>
            ))}
            {coupons.length === 0 && <p style={{ color: '#64748b' }}>Nenhum cupom ativo no momento.</p>}
          </div>
        </div>
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
                    placeholder="Ex: electronics"
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>Shopee Keyword</label>
                  <input 
                    type="text" 
                    value={newCategory.shopeeSlug}
                    onChange={e => setNewCategory({...newCategory, shopeeSlug: e.target.value})}
                    placeholder="Ex: fone bluetooth"
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>ML Category ID</label>
                  <input 
                    type="text" 
                    value={newCategory.mlCategoryId}
                    onChange={e => setNewCategory({...newCategory, mlCategoryId: e.target.value})}
                    placeholder="Ex: MLB1648"
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
                              <label style={{ fontSize: '10px', display: 'block' }}>Amazon</label>
                              <input 
                                className="form-field-input"
                                style={{ width: '100%' }}
                                value={editAmazonSlug}
                                onChange={e => setEditAmazonSlug(e.target.value)}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', display: 'block' }}>Shopee</label>
                              <input 
                                className="form-field-input"
                                style={{ width: '100%' }}
                                value={editShopeeSlug}
                                onChange={e => setEditShopeeSlug(e.target.value)}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', display: 'block' }}>ML ID</label>
                              <input 
                                className="form-field-input"
                                style={{ width: '100%' }}
                                value={editMlCategoryId}
                                onChange={e => setEditMlCategoryId(e.target.value)}
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
                              <span style={{ marginRight: '1rem' }}>Amazon: <code style={{ color: '#2563eb' }}>{cat.amazonSlug || '-'}</code></span>
                              <span style={{ marginRight: '1rem' }}>Shopee: <code style={{ color: '#ea580c' }}>{cat.shopeeSlug || '-'}</code></span>
                              <span>ML: <code style={{ color: '#eab308' }}>{cat.mlCategoryId || '-'}</code></span>
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

        {activeTab === 'pools' && (
          <section className="settings-section">
             <div className="admin-header-row" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-title-section">
                <h2>🔗 Gerenciador de Links Rotativos</h2>
                <p>Crie um link único que redireciona automaticamente para grupos que ainda têm vagas.</p>
              </div>
            </div>

            <div className="admin-card" style={{ marginBottom: '2rem' }}>
              <h3>Novo Gerenciador por Categoria</h3>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <select 
                  className="form-field-input" 
                  style={{ flex: 1 }}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  value={selectedPoolId || ''}
                >
                  <option value="">Selecione uma categoria...</option>
                  {dbCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => selectedPoolId && handleCreatePool(selectedPoolId)}
                  disabled={!selectedPoolId || pools.some(p => p.category === selectedPoolId)}
                >
                  Criar Gerenciador
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                Isso criará a rota: <code>{affiliateConfig.siteUrl}/entrar/[categoria]</code>
              </p>
            </div>

            <div className="pools-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              {pools.map(pool => (
                <div key={pool.id} className="admin-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px', color: '#000' }}>🏢 Categoria: {dbCategories.find(c => c.id === pool.category)?.label || pool.category}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Link de Divulgação: <a href={`${affiliateConfig.siteUrl}/entrar/${pool.category}`} target="_blank" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                          {affiliateConfig.siteUrl}/entrar/{pool.category}
                        </a>
                      </p>
                    </div>
                    <button className="btn btn-delete btn-sm" onClick={() => handleDeletePool(pool.id)}>
                       🗑️ Excluir Gerenciador
                    </button>
                  </div>

                  <div className="groups-table" style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                          <th style={{ padding: '12px' }}>Nome do Grupo</th>
                          <th style={{ padding: '12px' }}>Link de Convite</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Vagas</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pool.groups.map(group => (
                          <tr key={group.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>{group.name}</td>
                            <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                              <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{group.inviteLink?.substring(0, 30)}...</code>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <input 
                                  type="number" 
                                  value={group.memberCount} 
                                  onChange={(e) => handleUpdateGroupStats(pool.id, group.id, { memberCount: parseInt(e.target.value) })}
                                  style={{ width: '60px', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {group.maxCapacity}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleUpdateGroupStats(pool.id, group.id, { isActive: !group.isActive })}
                                style={{ 
                                  padding: '4px 10px', 
                                  borderRadius: '10px', 
                                  fontSize: '0.7rem', 
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: group.isActive ? '#dcfce7' : '#fee2e2',
                                  color: group.isActive ? '#166534' : '#991b1b',
                                  fontWeight: 'bold'
                                }}
                              >
                                {group.isActive ? 'ATIVO' : 'PAUSADO'}
                              </button>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button className="btn btn-icon btn-delete" onClick={() => handleRemoveGroupFromPool(pool.id, group.id)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: 'white' }}>
                          <td colSpan={5} style={{ padding: '15px' }}>
                             <div style={{ display: 'flex', gap: '10px' }}>
                                <input id={`name-${pool.id}`} type="text" placeholder="Nome do Grupo" style={{ flex: 1, fontSize: '0.8rem' }} />
                                <input id={`link-${pool.id}`} type="text" placeholder="https://chat.whatsapp.com/..." style={{ flex: 2, fontSize: '0.8rem' }} />
                                <button className="btn btn-sm btn-primary" onClick={() => {
                                  const name = (document.getElementById(`name-${pool.id}`) as any).value;
                                  const link = (document.getElementById(`link-${pool.id}`) as any).value;
                                  if (name && link) handleAddGroupToPool(pool.id, { name, inviteLink: link });
                                }}>➕ Adicionar Grupo</button>
                             </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              
              {pools.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                   Nenhum gerenciador de links criado ainda. Selecione uma categoria acima para começar.
                </div>
              )}
            </div>
          </section>
        )}
        {activeTab === 'offers' && (
          <section className="settings-section">
            <div className="admin-header-row" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-title-section">
                <h2>📦 Central de Ofertas</h2>
                <p>Ofertas reais e atualizadas de todas as lojas. Envie para seus grupos ou salve no site.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={fetchAllOffers} 
                  disabled={loadingOffers}
                  style={{ 
                    background: loadingOffers ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #dc2626)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '12px 24px', 
                    borderRadius: '12px', 
                    fontWeight: 'bold', 
                    fontSize: '0.95rem',
                    cursor: loadingOffers ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {loadingOffers ? '⏳ Atualizando...' : '🔄 Atualizar Ofertas'}
                </button>
              </div>
            </div>

            {/* ── Platform Fetch Buttons ── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Buscar na loja:</span>
              <button
                className="btn btn-sm"
                onClick={fetchAllOffers}
                disabled={loadingOffers}
                style={{ background: '#0f172a', color: '#fff', border: '1px solid #1e293b', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                {loadingOffers ? '⏳' : '🔄'} Buscar Todas
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchOffers}
                disabled={loadingOffers}
                style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                {loadingOffers ? '⏳' : '🛒'} Amazon
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchOffersML}
                disabled={loadingOffers}
                style={{ background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                {loadingOffers ? '⏳' : '🤝'} Mercado Livre
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchOffersShopee}
                disabled={loadingOffers}
                style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                {loadingOffers ? '⏳' : '🛍️'} Shopee
              </button>
              <button
                className="btn btn-sm"
                onClick={fetchOffersMagalu}
                disabled={loadingOffers}
                style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                {loadingOffers ? '⏳' : '🟣'} Magalu
              </button>
              <button
                className="btn btn-sm"
                onClick={async () => {
                  if (!confirm('Forçar varredura completa na Amazon (1-3 min)?')) return;
                  setLoadingOffers(true);
                  await fetch('/api/amazon/sync', { method: 'POST', body: JSON.stringify({ config: { isAuto: false } }) });
                  await fetchOffers();
                  setLoadingOffers(false);
                }}
                disabled={loadingOffers}
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 'bold', fontSize: '0.78rem' }}
              >
                🔄 Varredura Completa Amazon
              </button>

              {/* Count badge */}
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                {offers.filter((o: any) => offerFilter === 'all' || o.platform === offerFilter).length} ofertas
              </span>
            </div>

            {/* ── Filter Pills ── */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: '🌐 Todas', count: offers.length },
                { key: 'amazon', label: '🛒 Amazon', count: offers.filter((o: any) => o.platform === 'amazon').length },
                { key: 'mercadolivre', label: '🤝 Mercado Livre', count: offers.filter((o: any) => o.platform === 'mercadolivre').length },
                { key: 'shopee', label: '🛍️ Shopee', count: offers.filter((o: any) => o.platform === 'shopee').length },
                { key: 'magalu', label: '🟣 Magalu', count: offers.filter((o: any) => o.platform === 'magalu').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setOfferFilter(key)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem',
                    border: offerFilter === key ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    background: offerFilter === key ? '#fff7ed' : '#f8fafc',
                    color: offerFilter === key ? '#c2410c' : '#64748b',
                    fontWeight: offerFilter === key ? 'bold' : 'normal',
                    transition: 'all 0.15s'
                  }}
                >
                  {label} {count > 0 && <span style={{ fontSize: '0.72rem', background: '#e2e8f0', borderRadius: '10px', padding: '1px 6px', marginLeft: '4px' }}>{count}</span>}
                </button>
              ))}
            </div>

            {botStatus !== 'connected' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.85rem' }}>
                ⚠️ O robô não está conectado. Conecte o WhatsApp na aba <b>Config Bot → Conexão</b> para poder enviar.
              </div>
            )}
            {selectedGroups.length === 0 && botStatus === 'connected' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', color: '#92400e', fontSize: '0.85rem' }}>
                ⚠️ Nenhum grupo selecionado. Selecione o grupo de destino na aba <b>Config Bot → Grupos Automáticos</b>.
              </div>
            )}

            {loadingOffers ? (
              <div className="admin-loading">Buscando ofertas...</div>
            ) : offers.filter((o: any) => offerFilter === 'all' || o.platform === offerFilter).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p>Nenhuma oferta {offerFilter !== 'all' ? `da ${offerFilter}` : ''} carregada ainda.</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchAllOffers}>🔍 Buscar Ofertas Agora</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {offers.filter((o: any) => offerFilter === 'all' || o.platform === offerFilter).map((product: any) => (
                  <div key={product.id} className="admin-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>

                    {/* Platform badge */}
                    <div style={{ position: 'absolute', bottom: '195px', left: '10px', zIndex: 10 }}>
                      {product.platform === 'amazon' && <span style={{ fontSize: '0.65rem', background: '#ff9900', color: '#fff', padding: '2px 7px', borderRadius: '8px', fontWeight: 'bold' }}>🛒 Amazon</span>}
                      {product.platform === 'mercadolivre' && <span style={{ fontSize: '0.65rem', background: '#ffe600', color: '#333', padding: '2px 7px', borderRadius: '8px', fontWeight: 'bold' }}>🤝 ML</span>}
                      {product.platform === 'shopee' && <span style={{ fontSize: '0.65rem', background: '#ee4d2d', color: '#fff', padding: '2px 7px', borderRadius: '8px', fontWeight: 'bold' }}>🛍️ Shopee</span>}
                      {product.platform === 'magalu' && <span style={{ fontSize: '0.65rem', background: '#0086ff', color: '#fff', padding: '2px 7px', borderRadius: '8px', fontWeight: 'bold' }}>🟣 Magalu</span>}
                    </div>

                    {/* Product Image */}
                    <a 
                      href={product.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', position: 'relative', height: '180px', background: '#f8fafc', overflow: 'hidden', cursor: 'pointer' }}
                    >
                      <img 
                        src={product.image} 
                        alt={product.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                      {product.discount > 0 && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: 'white', borderRadius: '8px', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          -{product.discount}% OFF
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', padding: '3px 8px', fontSize: '0.7rem' }}>
                        {new Date(product._fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </a>

                    {/* Product Info */}
                    <div style={{ padding: '1rem' }}>
                      <a 
                        href={product.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f172a', marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'pointer' }}>
                          {product.title}
                        </p>
                      </a>

                      {/* Tempo da oferta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🕐 {(() => {
                            if (!product._fetchedAt) return 'agora';
                            const diff = Math.floor((Date.now() - new Date(product._fetchedAt).getTime()) / 1000);
                            if (diff < 60) return 'agora';
                            if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
                            if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
                            return `há ${Math.floor(diff / 86400)}d`;
                          })()}
                        </span>
                        {product._fetchedAt && (Date.now() - new Date(product._fetchedAt).getTime()) < 300000 && (
                          <span style={{ fontSize: '0.6rem', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '6px', fontWeight: 'bold' }}>⚡ RECENTE</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }}>
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {product.freeShipping && <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>FRETE GRÁTIS</span>}
                      </div>

                      {/* Copy Preview */}
                      <div style={{ marginBottom: '1rem' }}>
                        <button 
                          onClick={() => setExpandedCopy(expandedCopy === product.id ? null : product.id)}
                          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b', width: '100%', textAlign: 'left' }}
                        >
                          💬 {expandedCopy === product.id ? '▲ Esconder Rascunho' : '▼ Ver Estrutura Base'}
                        </button>
                        {expandedCopy === product.id && (
                          <div style={{ marginTop: '8px' }}>
                            {!product.creativeCopy ? (
                              <div style={{ fontSize: '0.7rem', padding: '6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', marginBottom: '6px', fontWeight: 'bold', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span>✨</span>
                                <span>Este é um rascunho estrutural rápido. A copy autêntica da Inteligência Artificial pode ser gerada abaixo para você conferir antes.</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.7rem', padding: '6px', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '6px', fontWeight: 'bold', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span>✅</span>
                                <span>Mágica Concluída! Esta Copy Criativa Exclusiva Oficial será utilizada no envio ou divulgada no site (standby).</span>
                              </div>
                            )}

                            <div style={{ 
                              background: '#f8fafc', 
                              border: '1px dashed #cbd5e1', 
                              borderRadius: '8px', 
                              padding: '10px', 
                              fontSize: '0.75rem', 
                              color: '#475569',
                            }}>
                              {product.creativeCopy ? (
                                <textarea
                                  value={product.creativeCopy}
                                  onChange={(e) => {
                                    setOffers(prev => prev.map(o => o.id === product.id ? { ...o, creativeCopy: e.target.value } : o));
                                  }}
                                  style={{
                                    width: '100%', minHeight: '120px', fontSize: '0.8rem', 
                                    padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', resize: 'vertical',
                                    fontFamily: 'inherit', lineHeight: 1.4
                                  }}
                                />
                              ) : (
                                <pre style={{
                                   whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8rem',
                                   lineHeight: 1.4, margin: 0,
                                   maxHeight: '200px', overflowY: 'auto'
                                }}>
                                  {product._copy}
                                </pre>
                              )}
                            </div>

                            <button
                              className="btn btn-sm"
                              style={{ marginTop: '8px', width: '100%', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                              disabled={generatingCopyFor === product.id}
                              onClick={() => handleGenerateCopyOnly(product)}
                            >
                              {generatingCopyFor === product.id ? '🧠 Pensando...' : (product.creativeCopy ? '🔄 Recriar Copy Criativa' : '✨ Gerar Copy Criativa Agora')}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Send and Standby Buttons */}
                      <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '8px' }}>
                        <button
                          className="btn btn-sm"
                          style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', opacity: savingPromo === product.id ? 0.6 : 1 }}
                          disabled={savingPromo === product.id}
                          onClick={() => handleStandbyOffer(product)}
                        >
                          {savingPromo === product.id ? '⏳ Gerando...' : '💾 Salvar Site (Standby)'}
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, opacity: (sendingOffer === product.id || botStatus !== 'connected') ? 0.6 : 1 }}
                          disabled={sendingOffer === product.id || botStatus !== 'connected'}
                          onClick={() => handleSendOffer(product)}
                          title={botStatus !== 'connected' ? 'Conecte o bot para enviar mensagens' : 'Gera a Copy e dipara agora para o Zap'}
                        >
                          {sendingOffer === product.id ? '⏳ Enviando...' : '🚀 Enviar para Grupos'}
                        </button>
                      </div>
                      
                      <button
                         className="btn btn-sm btn-delete"
                         style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}
                         onClick={() => handleBanProduct(product)}
                      >
                         🚫 Banir Produto / Palavra-Chave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>


    </div>
  );
}
