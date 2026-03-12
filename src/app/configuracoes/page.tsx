'use client';

import { useState, useEffect } from 'react';

export default function Configuracoes() {
  const [mlId, setMlId] = useState('');
  const [shopeeId, setShopeeId] = useState('');
  const [aliexpressId, setAliexpressId] = useState('');
  const [amazonId, setAmazonId] = useState('');
  const [lomadeeId, setLomadeeId] = useState('');
  const [awinId, setAwinId] = useState('');
  const [rakutenId, setRakutenId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('affiliateConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setMlId(config.mercadolivreId || '');
        setShopeeId(config.shopeeId || '');
        setAliexpressId(config.aliexpressId || '');
        setAmazonId(config.amazonId || '');
        setLomadeeId(config.lomadeeId || '');
        setAwinId(config.awinId || '');
        setRakutenId(config.rakutenId || '');
      } catch {}
    }
  }, []);

  const handleSave = () => {
    const config = {
      mercadolivreId: mlId.trim(),
      shopeeId: shopeeId.trim(),
      aliexpressId: aliexpressId.trim(),
      amazonId: amazonId.trim(),
      lomadeeId: lomadeeId.trim(),
      awinId: awinId.trim(),
      rakutenId: rakutenId.trim(),
    };
    localStorage.setItem('affiliateConfig', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="main-container">
      <div className="settings-container">
        <section className="hero" style={{ paddingBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem' }}>
            ⚙️ <span className="gradient-text">Configurações</span>
          </h1>
          <p className="hero-description" style={{ fontSize: '0.95rem' }}>
            Configure seus links de afiliados para que os copys gerados incluam automaticamente seu ID.
          </p>
        </section>

        {/* AliExpress */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔴</span>
            <h2 style={{ margin: 0 }}>AliExpress</h2>
          </div>
          <p>Seu Tracking ID do AliExpress. Ele será usado para gerar seus links de afiliado.</p>
          <div className="form-group">
            <label className="form-label">Tracking ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seu-tracking-id"
              value={aliexpressId}
              onChange={(e) => setAliexpressId(e.target.value)}
            />
          </div>
        </div>

        {/* Amazon */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🟡</span>
            <h2 style={{ margin: 0 }}>Amazon</h2>
          </div>
          <p>Seu Associate Tag da Amazon Brasil. Ele será adicionado como tag= nos links.</p>
          <div className="form-group">
            <label className="form-label">Associate Tag</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seunid-20"
              value={amazonId}
              onChange={(e) => setAmazonId(e.target.value)}
            />
          </div>
        </div>

        {/* Lomadee */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔵</span>
            <h2 style={{ margin: 0 }}>Lomadee (SocialSoul)</h2>
          </div>
          <p>Seu ID de Afiliado (Source ID) da Lomadee.</p>
          <div className="form-group">
            <label className="form-label">Source ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: 12345678"
              value={lomadeeId}
              onChange={(e) => setLomadeeId(e.target.value)}
            />
          </div>
        </div>

        {/* Awin */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔵</span>
            <h2 style={{ margin: 0 }}>Awin</h2>
          </div>
          <p>Seu Publisher ID da Awin. Usado para gerar links de rastreamento.</p>
          <div className="form-group">
            <label className="form-label">Publisher ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: 123456"
              value={awinId}
              onChange={(e) => setAwinId(e.target.value)}
            />
          </div>
        </div>

        {/* Rakuten */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔴</span>
            <h2 style={{ margin: 0 }}>Rakuten Advertising</h2>
          </div>
          <p>Seu Affiliate ID / SID da Rakuten.</p>
          <div className="form-group">
            <label className="form-label">Affiliate ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seu-id-rakuten"
              value={rakutenId}
              onChange={(e) => setRakutenId(e.target.value)}
            />
          </div>
        </div>

        {/* Mercado Livre */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🟡</span>
            <h2 style={{ margin: 0 }}>Mercado Livre</h2>
          </div>
          <p>Seu ID de afiliado do Mercado Livre. Ele será adicionado como tracking_id nos links.</p>
          <div className="form-group">
            <label className="form-label">ID de Afiliado</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seu-id-mercado-livre"
              value={mlId}
              onChange={(e) => setMlId(e.target.value)}
            />
          </div>
        </div>

        {/* Shopee */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🟠</span>
            <h2 style={{ margin: 0 }}>Shopee</h2>
          </div>
          <p>Seu ID de afiliado da Shopee. Ele será adicionado como af_id nos links.</p>
          <div className="form-group">
            <label className="form-label">ID de Afiliado</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seu-id-shopee"
              value={shopeeId}
              onChange={(e) => setShopeeId(e.target.value)}
            />
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '2rem' }}>
          <button className="btn-save" onClick={handleSave}>
            💾 Salvar Configurações
          </button>
          {saved && (
            <span className="save-feedback">
              ✅ Configurações salvas!
            </span>
          )}
        </div>

        {/* Help */}
        <div className="settings-card" style={{ marginTop: '2rem' }}>
          <h2>❓ Como funciona</h2>
          <p style={{ marginBottom: '0.5rem' }}>
            O sistema gera copys com seus links de afiliados automaticamente.
          </p>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 2 }}>
            <p>1️⃣ Configure seus IDs de afiliado acima</p>
            <p>2️⃣ Volte ao Dashboard e explore os produtos quentes</p>
            <p>3️⃣ Clique em <strong>&quot;Gerar Copy&quot;</strong> no produto desejado</p>
            <p>4️⃣ Escolha o template (AIDA, PAS ou BAB)</p>
            <p>5️⃣ Copie o copy e cole nas suas redes sociais!</p>
          </div>
        </div>
      </div>
    </main>
  );
}
