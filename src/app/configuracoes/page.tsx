'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings, AffiliateConfig } from '@/lib/settings';

export default function Configuracoes() {
  const [mlId, setMlId] = useState('');
  const [shopeeId, setShopeeId] = useState('');
  const [aliexpressId, setAliexpressId] = useState('');
  const [amazonId, setAmazonId] = useState('');
  const [amazonAccessKey, setAmazonAccessKey] = useState('');
  const [amazonSecretKey, setAmazonSecretKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        // Try Supabase first
        const config = await getSettings();
        if (config) {
          setMlId(config.mercadolivreId || '');
          setShopeeId(config.shopeeId || '');
          setAliexpressId(config.aliexpressId || '');
          setAmazonId(config.amazonId || '');
          setAmazonAccessKey(config.amazonAccessKey || '');
          setAmazonSecretKey(config.amazonSecretKey || '');
        } else {
          // Fallback to localStorage if Supabase has nothing
          const local = localStorage.getItem('affiliateConfig');
          if (local) {
            const parsed = JSON.parse(local);
            setMlId(parsed.mercadolivreId || '');
            setShopeeId(parsed.shopeeId || '');
            setAliexpressId(parsed.aliexpressId || '');
            setAmazonId(parsed.amazonId || '');
            setAmazonAccessKey(parsed.amazonAccessKey || '');
            setAmazonSecretKey(parsed.amazonSecretKey || '');
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    const config: AffiliateConfig = {
      mercadolivreId: mlId.trim(),
      shopeeId: shopeeId.trim(),
      aliexpressId: aliexpressId.trim(),
      amazonId: amazonId.trim(),
      amazonAccessKey: amazonAccessKey.trim(),
      amazonSecretKey: amazonSecretKey.trim(),
    };
    
    try {
      // Save to both for reliability
      localStorage.setItem('affiliateConfig', JSON.stringify(config));
      await saveSettings(config);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert('Erro ao salvar as configurações no banco de dados.');
    }
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

        {/* Amazon */}
        <div className="settings-card border-glow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🟡</span>
            <h2 style={{ margin: 0 }}>Amazon</h2>
          </div>
          <p>Seu Associate Tag da Amazon Brasil. Ele será adicionado como tag= nos links.</p>
          <div className="form-group">
            <label className="form-label">Associate Tag (Partner Tag)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: seunid-20"
              value={amazonId}
              onChange={(e) => setAmazonId(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Access Key</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: AKIA..."
              value={amazonAccessKey}
              onChange={(e) => setAmazonAccessKey(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Secret Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="Ex: sua-chave-secreta"
              value={amazonSecretKey}
              onChange={(e) => setAmazonSecretKey(e.target.value)}
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
