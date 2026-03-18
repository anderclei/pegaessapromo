'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings, AffiliateConfig } from '@/lib/settings';

export default function Configuracoes() {
  const [mlId, setMlId] = useState('');
  const [shopeeId, setShopeeId] = useState('');
  const [aliexpressId, setAliexpressId] = useState('');
  const [amazonId, setAmazonId] = useState('andercleipino-20');
  const [amazonAccessKey, setAmazonAccessKey] = useState('amzn1.application-oa2-client.27e8dc0d2d1d48b29a171860cf840a12');
  const [amazonSecretKey, setAmazonSecretKey] = useState('amzn1.oa2-cs.v1.b69c917a94b07978ac42e9a484a4728ce6c7461afe375491a4701179795bb397a');
  const [geminiKey, setGeminiKey] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getSettings();
        const local = localStorage.getItem('affiliateConfig');
        const localParsed = local ? JSON.parse(local) : null;
        
        // Merge strategy: Database > LocalStorage > Default State
        const final = {
          mercadolivreId: config?.mercadolivreId || localParsed?.mercadolivreId || '',
          shopeeId: config?.shopeeId || localParsed?.shopeeId || '',
          aliexpressId: config?.aliexpressId || localParsed?.aliexpressId || '',
          amazonId: config?.amazonId || localParsed?.amazonId || 'andercleipino-20',
          amazonAccessKey: config?.amazonAccessKey || localParsed?.amazonAccessKey || 'amzn1.application-oa2-client.27e8dc0d2d1d48b29a171860cf840a12',
          amazonSecretKey: config?.amazonSecretKey || localParsed?.amazonSecretKey || 'amzn1.oa2-cs.v1.b69c917a94b07978ac42e9a484a4728ce6c7461afe375491a4701179795bb397a',
          geminiKey: config?.geminiKey || localParsed?.geminiKey || '',
          siteUrl: config?.siteUrl || localParsed?.siteUrl || 'https://pegaessapromo.com.br',
        };

        const isDummy = (val: string) => !val || val.toLowerCase().includes('dummy') || val === 'password123';

        setMlId(final.mercadolivreId);
        setShopeeId(final.shopeeId);
        setAliexpressId(final.aliexpressId);
        setAmazonId(isDummy(final.amazonId) ? 'andercleipino-20' : final.amazonId);
        setAmazonAccessKey(isDummy(final.amazonAccessKey) ? 'amzn1.application-oa2-client.27e8dc0d2d1d48b29a171860cf840a12' : final.amazonAccessKey);
        setAmazonSecretKey(isDummy(final.amazonSecretKey) ? 'amzn1.oa2-cs.v1.b69c917a94b07978ac42e9a484a4728ce6c7461afe375491a4701179795bb397a' : final.amazonSecretKey);
        setGeminiKey(final.geminiKey);
        setSiteUrl(final.siteUrl);
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
      geminiKey: geminiKey.trim(),
      siteUrl: siteUrl.trim(),
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

        {/* Global Settings (Gemini & Site) */}
        <div className="settings-card border-glow" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <h2 style={{ margin: 0 }}>Gerais e Inteligência Artificial</h2>
          </div>
          <p>Configure a URL do seu site e a chave da IA (Gemini) para copys automáticas.</p>
          <div className="form-group">
            <label className="form-label">URL Base do seu Portal</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: https://pegaessapromo.com.br"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Google Gemini API Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="Sua chave da API AI Studio"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
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
