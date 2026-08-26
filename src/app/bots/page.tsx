'use client';

import { useState, useEffect, useCallback } from 'react';

import { BotStatus, WhatsAppGroup, GroupCategory, GROUP_CATEGORIES, InstagramPostData, PostLog } from '@/lib/bots/types';

interface GroupConfig extends WhatsAppGroup {
  enabled: boolean;
}

export default function BotsPage() {
  // WhatsApp state
  const [waStatus, setWaStatus] = useState<BotStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [groupConfigs, setGroupConfigs] = useState<GroupConfig[]>([]);
  const [connectedPhone, setConnectedPhone] = useState<string>('');
  const [waLoading, setWaLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  // Instagram state
  const [instaPosts, setInstaPosts] = useState<InstagramPostData[]>([]);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [interval, setIntervalVal] = useState(60);
  const [template, setTemplate] = useState<'aida' | 'pas' | 'bab'>('aida');
  const [scheduleWa, setScheduleWa] = useState(true);
  const [scheduleInsta, setScheduleInsta] = useState(true);
  const [maxPosts, setMaxPosts] = useState(3);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Logs
  const [logs, setLogs] = useState<PostLog[]>([]);

  // Affiliate config
  const [affiliateConfig, setAffiliateConfig] = useState({
    mercadolivreId: '',
    shopeeId: '',
  });

  // Group Pools state
  const [pools, setPools] = useState<any[]>([]);
  const [newPoolCategory, setNewPoolCategory] = useState('informatica');
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLink, setNewGroupLink] = useState('');
  const [newGroupCapacity, setNewGroupCapacity] = useState(250);

  // Active tab
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram' | 'schedule' | 'groups'>('whatsapp');

  // Load saved group configs and affiliate config
  useEffect(() => {
    const savedAff = localStorage.getItem('affiliateConfig');
    if (savedAff) {
      try { setAffiliateConfig(JSON.parse(savedAff)); } catch {}
    }
    const savedGroups = localStorage.getItem('groupConfigs');
    if (savedGroups) {
      try { setGroupConfigs(JSON.parse(savedGroups)); } catch {}
    }
  }, []);

  // Save group configs whenever they change
  useEffect(() => {
    if (groupConfigs.length > 0) {
      localStorage.setItem('groupConfigs', JSON.stringify(groupConfigs));
    }
  }, [groupConfigs]);

  // Poll WhatsApp status
  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bots/whatsapp');
      const data = await res.json();
      setWaStatus(data.status);
      setQrCode(data.qrCode);
      setConnectedPhone(data.connectedPhone || '');

      // Merge fetched groups with saved configs
      if (data.groups && data.groups.length > 0) {
        setGroupConfigs(prev => {
          const newConfigs: GroupConfig[] = data.groups.map((g: WhatsAppGroup) => {
            const existing = prev.find(p => p.id === g.id);
            return {
              ...g,
              enabled: existing?.enabled ?? false,
              categories: (existing?.categories ?? ['todos']) as GroupCategory[],
            };
          });
          return newConfigs;
        });
      }
    } catch {}
  }, []);

  // Poll schedule status
  const fetchScheduleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bots/schedule');
      const data = await res.json();
      setScheduleEnabled(data.isRunning);
      setLogs(data.logs || []);
      if (data.config) {
        setIntervalVal(data.config.intervalMinutes);
        setTemplate(data.config.template);
        setScheduleWa(data.config.platforms?.whatsapp ?? true);
        setScheduleInsta(data.config.platforms?.instagram ?? true);
        setMaxPosts(data.config.maxPostsPerRun ?? 3);
      }
    } catch {}
  }, []);

  // Poll Instagram posts
  const fetchInstaPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/bots/instagram');
      const data = await res.json();
      setInstaPosts(data.posts || []);
    } catch {}
  }, []);

  // Poll Group Pools
  const fetchPools = useCallback(async () => {
    try {
      const res = await fetch('/api/bots/groups');
      const data = await res.json();
      if (data.pools) setPools(data.pools);
    } catch {}
  }, []);

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchScheduleStatus();
    fetchInstaPosts();
    fetchPools();

    const pollInterval = setInterval(() => {
      fetchWhatsAppStatus();
      fetchScheduleStatus();
      fetchInstaPosts();
      fetchPools();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchWhatsAppStatus, fetchScheduleStatus, fetchInstaPosts]);

  // WhatsApp actions
  const handleWaConnect = async () => {
    setWaLoading(true);
    try {
      await fetch('/api/bots/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const qrPoll = setInterval(async () => {
        await fetchWhatsAppStatus();
      }, 2000);
      setTimeout(() => clearInterval(qrPoll), 30000);
    } catch {}
    setWaLoading(false);
  };

  const handleWaDisconnect = async () => {
    await fetch('/api/bots/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    await fetchWhatsAppStatus();
  };

  const handleGroupToggle = (groupId: string) => {
    setGroupConfigs(prev =>
      prev.map(g => g.id === groupId ? { ...g, enabled: !g.enabled } : g)
    );
  };

  const handleGroupCategoryToggle = (groupId: string, category: GroupCategory) => {
    setGroupConfigs(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const cats = g.categories.includes(category)
          ? g.categories.filter(c => c !== category)
          : [...g.categories, category];
        // If "todos" is selected, clear others; if something else is selected, remove "todos"
        if (category === 'todos') {
          return { ...g, categories: ['todos'] as GroupCategory[] };
        } else {
          return { ...g, categories: cats.filter(c => c !== 'todos') as GroupCategory[] };
        }
      })
    );
  };

  const getSelectedGroups = () =>
    groupConfigs.filter(g => g.enabled).map(g => g.id);

  // Group Pools actions
  const handleCreatePool = async () => {
    await fetch('/api/bots/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createPool', payload: { category: newPoolCategory } })
    });
    fetchPools();
  };

  const handleDeletePool = async (poolId: string) => {
    if (!window.confirm('Excluir este pool de grupos?')) return;
    await fetch('/api/bots/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deletePool', payload: { poolId } })
    });
    fetchPools();
  };

  const handleAddGroupToPool = async (poolId: string) => {
    if (!newGroupName || !newGroupLink) return;
    await fetch('/api/bots/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addGroup',
        payload: {
          poolId,
          group: { name: newGroupName, inviteLink: newGroupLink, maxCapacity: newGroupCapacity }
        }
      })
    });
    setNewGroupName('');
    setNewGroupLink('');
    setActivePoolId(null);
    fetchPools();
  };

  const handleRemoveGroupFromPool = async (poolId: string, groupId: string) => {
    if (!window.confirm('Remover este grupo do pool?')) return;
    await fetch('/api/bots/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'removeGroup', payload: { poolId, groupId } })
    });
    fetchPools();
  };

  // Schedule actions
  const handleScheduleToggle = async () => {
    setScheduleLoading(true);
    try {
      const action = scheduleEnabled ? 'stop' : 'start';
      await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          groups: getSelectedGroups(),
          affiliateConfig,
          config: {
            intervalMinutes: interval,
            template,
            platforms: { whatsapp: scheduleWa, instagram: scheduleInsta },
            maxPostsPerRun: maxPosts,
          },
        }),
      });
      await fetchScheduleStatus();
    } catch {}
    setScheduleLoading(false);
  };

  const handleRunNow = async () => {
    setScheduleLoading(true);
    try {
      await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-now',
          groups: getSelectedGroups(),
          affiliateConfig,
        }),
      });
      await fetchScheduleStatus();
      await fetchInstaPosts();
    } catch {}
    setScheduleLoading(false);
  };

  // Instagram actions
  const handleCopyCaption = async (post: InstagramPostData) => {
    const fullText = post.caption + (post.hashtags ? '\n\n' + post.hashtags : '');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    }
  };

  const handleDeletePost = async (postId: string) => {
    await fetch('/api/bots/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', postId }),
    });
    await fetchInstaPosts();
  };

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case 'connected': return 'var(--accent-green)';
      case 'connecting':
      case 'qr_ready': return 'var(--accent-orange)';
      case 'error': return 'var(--accent-red)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusLabel = (status: BotStatus) => {
    switch (status) {
      case 'connected': return '🟢 Conectado';
      case 'connecting': return '🟡 Conectando...';
      case 'qr_ready': return '📱 Escaneie o QR Code';
      case 'error': return '🔴 Erro';
      default: return '⚫ Desconectado';
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const enabledGroupsCount = groupConfigs.filter(g => g.enabled).length;

  return (
    <main className="main-container">
      {/* Hero */}
      <section className="hero bots-hero">
        <div className="hero-badge">🤖 Automação de Postagens</div>
        <h1>
          <span className="gradient-text">Central de Bots</span>
        </h1>
        <p className="hero-description">
          Gerencie seus bots de WhatsApp e Instagram para postagem automática de ofertas.
        </p>
      </section>

      {/* Tab Navigation */}
      <div className="bots-tabs">
        <button
          className={`bots-tab ${activeTab === 'whatsapp' ? 'active whatsapp' : ''}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          💬 WhatsApp
        </button>
        <button
          className={`bots-tab ${activeTab === 'instagram' ? 'active instagram' : ''}`}
          onClick={() => setActiveTab('instagram')}
        >
          📸 Instagram
        </button>
        <button
          className={`bots-tab ${activeTab === 'schedule' ? 'active schedule' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          ⏰ Agendamento
        </button>
        <button
          className={`bots-tab ${activeTab === 'groups' ? 'active groups' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          🔄 Rotação de Grupos
        </button>
      </div>

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <div className="bot-section">
          {/* Connection Status */}
          <div className="bot-card">
            <div className="bot-card-header">
              <h2>💬 WhatsApp Bot</h2>
              <span className="bot-status-badge" style={{ background: getStatusColor(waStatus) }}>
                {getStatusLabel(waStatus)}
              </span>
            </div>
            <div className="bot-card-body">
              {waStatus === 'disconnected' && (
                <div className="bot-connect-section">
                  <p className="bot-description">
                    Conecte seu WhatsApp para enviar ofertas automaticamente nos seus grupos.
                  </p>
                  <button
                    className="btn btn-primary bot-action-btn"
                    onClick={handleWaConnect}
                    disabled={waLoading}
                  >
                    {waLoading ? '⏳ Iniciando...' : '🔌 Conectar WhatsApp'}
                  </button>
                </div>
              )}

              {(waStatus === 'connecting' || waStatus === 'qr_ready') && (
                <div className="bot-qr-section">
                  {qrCode ? (
                    <>
                      <p className="bot-description">
                        📱 Abra o WhatsApp no seu celular → Menu → Dispositivos Conectados → Conectar Dispositivo
                      </p>
                      <div className="qr-code-container">
                        <img src={qrCode} alt="QR Code WhatsApp" className="qr-code-image" />
                      </div>
                    </>
                  ) : (
                    <div className="bot-loading">
                      <div className="spinner" />
                      <p>Gerando QR Code...</p>
                    </div>
                  )}
                </div>
              )}

              {waStatus === 'connected' && (
                <div className="bot-connected-section">
                  <div className="connected-info">
                    <span className="connected-phone">📱 {connectedPhone || 'WhatsApp Conectado'}</span>
                    <button className="btn btn-secondary btn-sm" onClick={handleWaDisconnect}>
                      🔌 Desconectar
                    </button>
                  </div>

                  {/* Groups with Category Assignment */}
                  <div className="groups-section">
                    <h3>📋 Seus Grupos ({groupConfigs.length})</h3>
                    <p className="groups-description">
                      Selecione os grupos e vincule categorias. Cada grupo só receberá ofertas das categorias selecionadas.
                    </p>
                    {groupConfigs.length === 0 ? (
                      <p className="bot-description">Nenhum grupo encontrado. Certifique-se de que o bot está em grupos.</p>
                    ) : (
                      <div className="groups-list">
                        {groupConfigs.map(group => (
                          <div key={group.id} className={`group-card ${group.enabled ? 'active' : ''}`}>
                            <div className="group-card-header">
                              <label className="group-toggle-label">
                                <input
                                  type="checkbox"
                                  checked={group.enabled}
                                  onChange={() => handleGroupToggle(group.id)}
                                />
                                <div className="group-info">
                                  <span className="group-name">{group.name}</span>
                                  <span className="group-meta">
                                    👥 {group.participantsCount} membros
                                    {group.isAdmin && ' · 👑 Admin'}
                                  </span>
                                </div>
                              </label>
                              {group.enabled && (
                                <button
                                  className={`btn btn-secondary btn-sm ${editingGroup === group.id ? 'btn-active' : ''}`}
                                  onClick={() => setEditingGroup(editingGroup === group.id ? null : group.id)}
                                >
                                  🏷️ {group.categories.includes('todos') ? 'Todas' : `${group.categories.length} cat.`}
                                </button>
                              )}
                            </div>

                            {/* Category Selector (expandable) */}
                            {editingGroup === group.id && group.enabled && (
                              <div className="group-categories">
                                <div className="group-categories-label">Categorias deste grupo:</div>
                                <div className="category-chips">
                                  {GROUP_CATEGORIES.map(cat => (
                                    <button
                                      key={cat.value}
                                      className={`category-chip ${group.categories.includes(cat.value) ? 'active' : ''}`}
                                      onClick={() => handleGroupCategoryToggle(group.id, cat.value)}
                                    >
                                      {cat.icon} {cat.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {enabledGroupsCount > 0 && (
                    <div className="selected-info">
                      ✅ {enabledGroupsCount} grupo(s) ativo(s)
                    </div>
                  )}
                </div>
              )}

              {waStatus === 'error' && (
                <div className="bot-error-section">
                  <p>❌ Ocorreu um erro. Tente reconectar.</p>
                  <button className="btn btn-primary bot-action-btn" onClick={handleWaConnect}>
                    🔄 Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instagram Tab */}
      {activeTab === 'instagram' && (
        <div className="bot-section">
          <div className="bot-card">
            <div className="bot-card-header">
              <h2>📸 Posts para Instagram</h2>
              <span className="bot-status-badge bot-badge-pink">
                {instaPosts.length} posts gerados
              </span>
            </div>
            <div className="bot-card-body">
              <p className="bot-description">
                Posts são gerados automaticamente pelo agendamento ou manualmente.
                Copie o texto e poste no seu Instagram.
              </p>

              {instaPosts.length === 0 ? (
                <div className="empty-state bot-empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p>Nenhum post gerado ainda. Ative o agendamento ou gere manualmente.</p>
                </div>
              ) : (
                <div className="insta-posts-grid">
                  {instaPosts.map(post => (
                    <div key={post.id} className="insta-post-card">
                      <div className="insta-post-header">
                        <div className="insta-post-product">{post.productTitle}</div>
                        <span className="insta-post-time">{formatTime(post.createdAt)}</span>
                      </div>
                      <div className="insta-post-body">
                        <div className="insta-post-caption">{post.caption}</div>
                        {post.hashtags && (
                          <div className="insta-post-hashtags">{post.hashtags}</div>
                        )}
                      </div>
                      <div className="insta-post-actions">
                        <button
                          className={`copy-btn ${copiedPostId === post.id ? 'copied' : ''}`}
                          onClick={() => handleCopyCaption(post)}
                        >
                          {copiedPostId === post.id ? '✅ Copiado!' : '📋 Copiar Caption'}
                        </button>
                        <a
                          href={post.affiliateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          🔗 Link
                        </a>
                        <button
                          className="btn btn-secondary btn-sm btn-danger"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="bot-section">
          <div className="bot-card">
            <div className="bot-card-header">
              <h2>⏰ Agendamento Automático</h2>
              <span
                className={`bot-status-badge ${scheduleEnabled ? 'bot-badge-green' : 'bot-badge-muted'}`}
              >
                {scheduleEnabled ? '🟢 Ativo' : '⚫ Inativo'}
              </span>
            </div>
            <div className="bot-card-body">
              {/* Schedule Config */}
              <div className="schedule-config">
                <div className="schedule-row">
                  <label className="schedule-label" htmlFor="schedule-interval">Intervalo</label>
                  <select
                    id="schedule-interval"
                    title="Intervalo de postagem"
                    className="schedule-select"
                    value={interval}
                    onChange={e => setIntervalVal(Number(e.target.value))}
                    disabled={scheduleEnabled}
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                    <option value={240}>4 horas</option>
                  </select>
                </div>

                <div className="schedule-row">
                  <label className="schedule-label" htmlFor="schedule-template">Template</label>
                  <select
                    id="schedule-template"
                    title="Template de copy"
                    className="schedule-select"
                    value={template}
                    onChange={e => setTemplate(e.target.value as 'aida' | 'pas' | 'bab')}
                    disabled={scheduleEnabled}
                  >
                    <option value="aida">🎯 AIDA — Atenção → Interesse → Desejo → Ação</option>
                    <option value="pas">💡 PAS — Problema → Agitação → Solução</option>
                    <option value="bab">🌉 BAB — Antes → Depois → Ponte</option>
                  </select>
                </div>

                <div className="schedule-row">
                  <label className="schedule-label" htmlFor="schedule-maxposts">Posts por ciclo</label>
                  <select
                    id="schedule-maxposts"
                    title="Quantidade de posts por ciclo"
                    className="schedule-select"
                    value={maxPosts}
                    onChange={e => setMaxPosts(Number(e.target.value))}
                    disabled={scheduleEnabled}
                  >
                    <option value={1}>1 produto</option>
                    <option value={2}>2 produtos</option>
                    <option value={3}>3 produtos</option>
                    <option value={5}>5 produtos</option>
                    <option value={10}>10 produtos</option>
                  </select>
                </div>

                <div className="schedule-row">
                  <label className="schedule-label">Plataformas</label>
                  <div className="schedule-platforms">
                    <label className="platform-toggle">
                      <input
                        type="checkbox"
                        checked={scheduleWa}
                        onChange={e => setScheduleWa(e.target.checked)}
                        disabled={scheduleEnabled}
                      />
                      💬 WhatsApp
                    </label>
                    <label className="platform-toggle">
                      <input
                        type="checkbox"
                        checked={scheduleInsta}
                        onChange={e => setScheduleInsta(e.target.checked)}
                        disabled={scheduleEnabled}
                      />
                      📸 Instagram
                    </label>
                  </div>
                </div>

                {scheduleWa && enabledGroupsCount === 0 && waStatus === 'connected' && (
                  <div className="schedule-warning">
                    ⚠️ Selecione pelo menos 1 grupo na aba WhatsApp para enviar mensagens.
                  </div>
                )}

                {scheduleWa && waStatus !== 'connected' && (
                  <div className="schedule-warning">
                    ⚠️ Conecte o WhatsApp primeiro na aba WhatsApp.
                  </div>
                )}

                {!affiliateConfig.mercadolivreId && !affiliateConfig.shopeeId && (
                  <div className="schedule-warning">
                    ⚠️ Configure seus links de afiliado em{' '}
                    <a href="/configuracoes" className="schedule-warning-link">Configurações</a>.
                  </div>
                )}
              </div>

              {/* Schedule Actions */}
              <div className="schedule-actions">
                <button
                  className={`btn ${scheduleEnabled ? 'btn-danger-full' : 'btn-primary'} bot-action-btn`}
                  onClick={handleScheduleToggle}
                  disabled={scheduleLoading}
                >
                  {scheduleLoading
                    ? '⏳ Processando...'
                    : scheduleEnabled
                    ? '⏹️ Parar Agendamento'
                    : '▶️ Iniciar Agendamento'}
                </button>
                <button
                  className="btn btn-secondary bot-action-btn"
                  onClick={handleRunNow}
                  disabled={scheduleLoading}
                >
                  🚀 Postar Agora
                </button>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bot-card bot-card-logs">
            <div className="bot-card-header">
              <h2>📜 Log de Atividade</h2>
              <span className="bot-status-badge bot-badge-blue">
                {logs.length} registros
              </span>
            </div>
            <div className="bot-card-body">
              {logs.length === 0 ? (
                <div className="empty-state bot-empty-state">
                  <p className="empty-state-muted">Nenhuma atividade registrada ainda.</p>
                </div>
              ) : (
                <div className="logs-list">
                  {logs.slice(0, 20).map(log => (
                    <div key={log.id} className={`log-item ${log.status}`}>
                      <span className="log-platform">
                        {log.platform === 'whatsapp' ? '💬' : '📸'}
                      </span>
                      <div className="log-content">
                        <span className="log-product">{log.productTitle}</span>
                        {log.groupName && (
                          <span className="log-group">→ {log.groupName}</span>
                        )}
                        {log.message && (
                          <span className="log-message">{log.message}</span>
                        )}
                      </div>
                      <div className="log-meta">
                        <span className={`log-status-dot ${log.status}`}>
                          {log.status === 'success' ? '✅' : '❌'}
                        </span>
                        <span className="log-time">{formatTime(log.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Pools Tab */}
      {activeTab === 'groups' && (
        <div className="bot-section">
          <div className="bot-card">
            <div className="bot-card-header">
              <h2>🔄 Rotação Inteligente (Smart Links)</h2>
              <span className="bot-status-badge bot-badge-blue">
                {pools.length} categorias
              </span>
            </div>
            <div className="bot-card-body">
              <p className="bot-description">
                Crie links inteligentes que redirecionam novos membros automaticamente para o próximo grupo com vagas.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', alignItems: 'center' }}>
                <select 
                  className="form-input" 
                  style={{ width: '200px', marginBottom: 0 }}
                  value={newPoolCategory}
                  onChange={e => setNewPoolCategory(e.target.value)}
                >
                  {GROUP_CATEGORIES.filter(c => c.value !== 'todos').map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleCreatePool}>
                  ➕ Criar Pool de Redirecionamento
                </button>
              </div>

              {pools.length === 0 ? (
                <div className="empty-state bot-empty-state">
                  <p>Nenhum pool criado. Crie um para começar a organizar seus grupos.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {pools.map(pool => {
                    const poolCat = GROUP_CATEGORIES.find(c => c.value === pool.category);
                    const smartLink = `${window.location.origin}/entrar/${pool.category}`;
                    
                    return (
                      <div key={pool.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: 'var(--bg-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--accent-orange)' }}>
                              {poolCat?.icon} {poolCat?.label}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Link Inteligente:</span>
                              <a href={smartLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-teal)', fontSize: '0.85rem', textDecoration: 'underline' }}>
                                {smartLink}
                              </a>
                            </div>
                          </div>
                          <button className="btn btn-secondary btn-sm btn-danger" onClick={() => handleDeletePool(pool.id)}>Excluir Pool</button>
                        </div>

                        {/* List Groups in Pool */}
                        <div style={{ marginTop: '1.5rem' }}>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>Grupos no Pool ({pool.groups?.length || 0})</h4>
                          
                          {pool.groups?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                              {pool.groups.map((g: any) => (
                                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{g.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Vagas: {g.memberCount} / {g.maxCapacity} • {g.inviteLink}
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveGroupFromPool(pool.id, g.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum grupo adicionado a este pool.</p>
                          )}

                          {activePoolId === pool.id ? (
                            <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '10px', marginBottom: '10px' }}>
                                <input type="text" className="form-input" placeholder="Nome do grupo interno" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                <input type="text" className="form-input" placeholder="Link de Convite (https://chat.whatsapp...)" value={newGroupLink} onChange={e => setNewGroupLink(e.target.value)} />
                                <input type="number" className="form-input" placeholder="Vagas" title="Capacidade máxima" value={newGroupCapacity} onChange={e => setNewGroupCapacity(Number(e.target.value))} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-save" onClick={() => handleAddGroupToPool(pool.id)}>Salvar Grupo</button>
                                <button className="btn btn-secondary" onClick={() => setActivePoolId(null)}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => setActivePoolId(pool.id)}>+ Adicionar Grupo a este Pool</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
