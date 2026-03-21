import { Product, CopyResult } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcDiscount(product: Product): string {
  if (product.originalPrice && product.originalPrice > product.price) {
    const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    return `${pct}%`;
  }
  return '';
}

// ── AIDA (Attention, Interest, Desire, Action) ──────────────────────
function generateAIDA(product: Product, affiliateLink: string): CopyResult[] {
  const discount = calcDiscount(product);
  const discountText = discount ? ` com ${discount} OFF` : '';
  const priceText = formatPrice(product.price);
  const stars = '⭐'.repeat(Math.min(Math.round(product.rating), 5));

  return [
    {
      platform: 'instagram',
      title: '📸 Copy para Instagram (AIDA)',
      body: `🔥 ACHADO IMPERDÍVEL${discountText}!\n\n` +
        `${product.title}\n\n` +
        `💰 Por apenas ${priceText}\n` +
        `${stars} (${product.reviews} avaliações)\n` +
        `📦 ${product.sales.toLocaleString('pt-BR')}+ vendidos!\n` +
        `${product.freeShipping ? '🚚 FRETE GRÁTIS!\n' : ''}` +
        `\n🔗 Link na bio ou clique aqui 👇\n${affiliateLink}`,
      hashtags: '#oferta #desconto #promocao #achados #compras #imperdivel #barato #ofertadodia',
      affiliateLink,
    },
    {
      platform: 'facebook',
      title: '📘 Copy para Facebook (AIDA)',
      body: `⚡ ATENÇÃO: Esse produto está BOMBANDO!\n\n` +
        `${product.title}\n\n` +
        `Eu encontrei esse produto que já vendeu mais de ${product.sales.toLocaleString('pt-BR')} unidades e tem ${product.reviews} avaliações positivas!\n\n` +
        `💲 Preço: ${priceText}${discountText}\n` +
        `${product.freeShipping ? '🚚 Com frete grátis!\n' : ''}\n` +
        `👉 Garanta o seu antes que acabe:\n${affiliateLink}`,
      hashtags: '#oferta #promocao #desconto',
      affiliateLink,
    },
    {
      platform: 'whatsapp',
      title: '💬 Copy para WhatsApp (AIDA)',
      body: `🚨 *OFERTA IMPERDÍVEL*${discountText}!\n\n` +
        `*${product.title}*\n\n` +
        `💰 *${priceText}*\n` +
        `⭐ ${product.rating.toFixed(1)} (${product.reviews} avaliações)\n` +
        `📦 +${product.sales.toLocaleString('pt-BR')} vendidos\n` +
        `${product.freeShipping ? '🚚 *FRETE GRÁTIS*\n' : ''}\n` +
        `👇 Compre aqui:\n${affiliateLink}`,
      hashtags: '',
      affiliateLink,
    },
    {
      platform: 'tiktok',
      title: '🎵 Copy para TikTok (AIDA)',
      body: `POV: você encontrou o melhor preço da internet 😱\n\n` +
        `${product.title}\n` +
        `💰 ${priceText}${discountText}\n` +
        `📦 +${product.sales.toLocaleString('pt-BR')} vendidos\n` +
        `${product.freeShipping ? '🚚 frete grátis!\n' : ''}\n` +
        `🔗 Link nos comentários 👇`,
      hashtags: '#achados #oferta #barato #desconto #tiktokfazcomprar #comprasdotiktok',
      affiliateLink,
    },
  ];
}

// ── PAS (Problem, Agitate, Solution) ────────────────────────────────
function generatePAS(product: Product, affiliateLink: string): CopyResult[] {
  const discount = calcDiscount(product);
  const discountText = discount ? ` com ${discount} de desconto` : '';
  const priceText = formatPrice(product.price);

  return [
    {
      platform: 'instagram',
      title: '📸 Copy para Instagram (PAS)',
      body: `😩 Cansado de pagar caro e receber produto ruim?\n\n` +
        `A gente sabe como é frustrante gastar dinheiro e se arrepender depois...\n\n` +
        `✅ Encontrei a solução perfeita:\n` +
        `*${product.title}*\n\n` +
        `💰 ${priceText}${discountText}\n` +
        `⭐ ${product.rating.toFixed(1)} com ${product.reviews} avaliações reais\n` +
        `📦 ${product.sales.toLocaleString('pt-BR')}+ pessoas já compraram!\n` +
        `${product.freeShipping ? '🚚 Frete grátis!\n' : ''}\n` +
        `🔗 Confira: ${affiliateLink}`,
      hashtags: '#solucao #achado #qualidade #bomegato #ofertadodia #compras',
      affiliateLink,
    },
    {
      platform: 'facebook',
      title: '📘 Copy para Facebook (PAS)',
      body: `🤔 Já gastou dinheiro num produto que não valeu a pena?\n\n` +
        `Isso é mais comum do que parece. Muita gente compra sem pesquisar e acaba se arrependendo.\n\n` +
        `Por isso eu pesquisei e encontrei esse produto incrível que tem ${product.reviews} avaliações positivas:\n\n` +
        `📌 ${product.title}\n` +
        `💲 ${priceText}${discountText}\n` +
        `${product.freeShipping ? '🚚 Com frete grátis!\n' : ''}\n` +
        `👉 ${affiliateLink}`,
      hashtags: '#dica #recomendacao #compracerta',
      affiliateLink,
    },
    {
      platform: 'whatsapp',
      title: '💬 Copy para WhatsApp (PAS)',
      body: `Oi! 😊\n\n` +
        `Sabe aquele produto que todo mundo indica?\n\n` +
        `*${product.title}*\n\n` +
        `✅ ${product.reviews} avaliações positivas\n` +
        `✅ +${product.sales.toLocaleString('pt-BR')} vendidos\n` +
        `✅ ${priceText}${discountText}\n` +
        `${product.freeShipping ? '✅ *Frete grátis*\n' : ''}\n` +
        `Compre pelo link: ${affiliateLink}`,
      hashtags: '',
      affiliateLink,
    },
    {
      platform: 'tiktok',
      title: '🎵 Copy para TikTok (PAS)',
      body: `coisa que eu queria ter descoberto antes 😭\n\n` +
        `${product.title}\n` +
        `💰 só ${priceText}${discountText}\n` +
        `⭐ ${product.rating.toFixed(1)} estrelas\n` +
        `${product.freeShipping ? '🚚 frete grátis\n' : ''}\n` +
        `tá na bio 🔗`,
      hashtags: '#compras #indicacao #achados #valeapena #tiktokfazcomprar',
      affiliateLink,
    },
  ];
}

// ── BAB (Before, After, Bridge) ─────────────────────────────────────
function generateBAB(product: Product, affiliateLink: string): CopyResult[] {
  const discount = calcDiscount(product);
  const discountText = discount ? ` (-${discount})` : '';
  const priceText = formatPrice(product.price);

  return [
    {
      platform: 'instagram',
      title: '📸 Copy para Instagram (BAB)',
      body: `❌ ANTES: Pagando caro em produtos sem qualidade\n` +
        `✅ DEPOIS: Produto top com avaliações reais por um preço justo\n\n` +
        `🌉 A ponte? Esse achado aqui:\n\n` +
        `${product.title}\n` +
        `💰 ${priceText}${discountText}\n` +
        `⭐ ${product.rating.toFixed(1)} (${product.reviews} avaliações)\n` +
        `📦 +${product.sales.toLocaleString('pt-BR')} vendidos\n` +
        `${product.freeShipping ? '🚚 Frete grátis!\n' : ''}\n` +
        `🔗 ${affiliateLink}`,
      hashtags: '#transformacao #antesedepois #achado #oferta #qualidade',
      affiliateLink,
    },
    {
      platform: 'facebook',
      title: '📘 Copy para Facebook (BAB)',
      body: `Imagine parar de se preocupar com a qualidade do que você compra online...\n\n` +
        `Com ${product.reviews} avaliações positivas e +${product.sales.toLocaleString('pt-BR')} vendas, esse produto fala por si:\n\n` +
        `📌 ${product.title}\n` +
        `💲 ${priceText}${discountText}\n` +
        `${product.freeShipping ? '🚚 Frete grátis incluído!\n' : ''}\n` +
        `Confira: ${affiliateLink}`,
      hashtags: '#confiavel #comprasegura #top',
      affiliateLink,
    },
    {
      platform: 'whatsapp',
      title: '💬 Copy para WhatsApp (BAB)',
      body: `Oie! Olha esse achado 👀\n\n` +
        `*${product.title}*\n\n` +
        `Todo mundo tá comprando (${product.sales.toLocaleString('pt-BR')}+ vendidos!)\n\n` +
        `💰 *${priceText}*${discountText}\n` +
        `⭐ Nota ${product.rating.toFixed(1)}\n` +
        `${product.freeShipping ? '🚚 *Frete grátis*\n' : ''}\n` +
        `${affiliateLink}`,
      hashtags: '',
      affiliateLink,
    },
    {
      platform: 'tiktok',
      title: '🎵 Copy para TikTok (BAB)',
      body: `eu antes vs eu depois de descobrir isso 💅\n\n` +
        `${product.title}\n` +
        `${priceText}${discountText} 🤯\n` +
        `${product.freeShipping ? 'frete grátis 📦\n' : ''}\n` +
        `link na bio!`,
      hashtags: '#antesedepois #musthave #achados #tiktokshop #recomendo',
      affiliateLink,
    },
  ];
}

export async function generateAllCopies(product: Product, affiliateLink: string, config?: any) {
  const result: any = {
    aida: generateAIDA(product, affiliateLink),
    pas: generatePAS(product, affiliateLink),
    bab: generateBAB(product, affiliateLink),
  };

  // If Gemini AI is configured, generate dynamic super-persuasive copies to replace the static ones
  if (config && config.geminiKey) {
    console.log(`[COPY] Solicitando copy ao Gemini para: ${product.title.substring(0, 40)}`);
    try {
      const genAI = new GoogleGenerativeAI(config.geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const discount = calcDiscount(product);
      const priceText = formatPrice(product.price);
      const oldPriceText = product.originalPrice && product.originalPrice > product.price ? formatPrice(product.originalPrice) : '';

      const richPrompt = `
Você é o mestre absoluto do copywriting para grupos de economia no WhatsApp.
Sua missão é criar uma mensagem COMPLETA, altamente chamativa e bem humorada de uma super oferta.

🔥 REGRAS DE OURO:
1. Comece com uma MANCHETE CRIATIVA e DIFERENTE para cada produto.
2. Seja MUITO BEM HUMORADO e use expressões engraçadas adaptadas ao produto. 
3. O tom de voz deve ser: ${config.copyStyle || 'Engraçado, informal e focado em economia'}.
4. Destaque o benefício do produto com gírias atuais.
5. Formatação WhatsApp: Use *negrito* nos preços e nos avisos importantes.

🚨 REGRAS DE PREÇO:
- MANTENHA OS CENTAVOS EXATAMENTE COMO INFORMADOS. NÃO INVENTE.

📦 DADOS DO PRODUTO A SEREM USADOS:
- Nome: "${product.title}"
- Preço Atual Exato: ${priceText}
${oldPriceText ? `- Preço Antigo: ${oldPriceText}` : ''}
${discount ? `- Desconto de: ${discount}` : ''}
${product.freeShipping ? `- Diferencial: FRETE GRÁTIS! 🚚` : ''}

🔗 CHAMADA PARA AÇÃO (OBRIGATÓRIO):
Ao final, em uma linha separada, inclua exatamente isto:
👇 COMPRE AGORA:
${affiliateLink}

IMPORTANTE: 
- NUNCA use saudações como 'Olá'. Vá direto para o "papo de oferta".
- Mensagem curta (máximo 120 palavras), com parágrafos separados para leitura fácil no celular.
`;

      let aiText = '';
      
      if (config.aiProvider === 'ollama') {
        const ollamaModel = config.ollamaModel || 'qwen2.5:1.5b';
        console.log(`[COPY] Chamando Ollama localmente (Modelo: ${ollamaModel})...`);
        
        try {
          const res = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              prompt: richPrompt,
              stream: true // Usa stream para manter a conexão ativa e não dar Timeout no NextJS!
            })
          });
          
          if (!res.ok) {
            const errTex = await res.text();
            throw new Error(`Erro Ollama [${res.status}]: ${errTex}`);
          }
          
          let aiStreamedText = '';
          const reader = (res.body as any)?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunkStr = decoder.decode(value, { stream: true });
              const lines = chunkStr.split('\n').filter(Boolean);
              for (const line of lines) {
                try {
                  const chunkData = JSON.parse(line);
                  if (chunkData.response) aiStreamedText += chunkData.response;
                } catch(e) {}
              }
            }
          }
          aiText = aiStreamedText;
        } catch (err: any) {
          console.error('[COPY] Falha ao conectar no Ollama:', err.message);
          throw new Error(`⚠️ Erro com Ollama (${ollamaModel}): ${err.message}. Verifique se ele está aberto e se o seu computador não travou por limite de memória RAM (gerar textos locais demora de 2 a 5 minutos num PC comum!).`);
        }
      } else {
        // Fallback or explicit Gemini
        const geminiResponse = await model.generateContent(richPrompt);
        aiText = geminiResponse.response.text();
      }
      
      console.log(`[COPY] IA respondeu (${aiText ? aiText.length : 0} chars)`);
      if (aiText && aiText.length > 20) {
        // Overwrite the WhatsApp copy for all templates just to be sure we use the AI copy whenever a template is chosen
        for (const template of ['aida', 'pas', 'bab']) {
           const waIndex = result[template].findIndex((c: any) => c.platform === 'whatsapp');
           if (waIndex !== -1) {
             result[template][waIndex].body = aiText;
           }
        }
        console.log('[COPY] WhatsApp template sobrescrito com sucesso via IA.');
      } else {
        console.warn('[COPY] Gemini retornou texto curto ou vazio. Usando fallback estático.');
      }
    } catch (e: any) {
      console.error('[COPY] Erro fatal no call da IA:', e);
      if (e.message && e.message.includes('Ollama')) {
         throw e; // Lança direto o erro limpo do Ollama
      }
      
      if (e.status === 429 || (e.message && e.message.includes('429'))) {
        throw new Error('⚠️ O limite grátis do Google (IA) foi atingido temporariamente (Muitos pedidos seguidos). Aguarde 1 minutinho e tente de novo!');
      }
      
      if (config.strictGemini) {
        let availableModels = "";
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiKey}`);
          const data = await res.json();
          if (data && data.models) {
             const models = data.models.map((m: any) => m.name.replace('models/', ''));
             availableModels = "\\nModelos liberados na sua conta: " + models.join(', ');
          }
        } catch (fetchErr) {}
        
        throw new Error('Falha na API da IA: ' + e.message + availableModels);
      }
    }
  } else {
    console.warn('[COPY] GeminiKey não encontrada no config. Pulando IA.');
    if (config && config.strictGemini) {
      throw new Error('Chave do Gemini ausente na configuração.');
    }
  }

  return result;
}

export function buildAffiliateLink(product: Product, config: any): string {
  const separator = product.url.includes('?') ? '&' : '?';
  
  if (product.platform === 'mercadolivre') {
    if (config.mercadolivreId) {
      return `${product.url}${separator}matt_tool=&matt_word=&matt_source=&matt_campaign_id=&matt_ad_group_id=&matt_match_type=&matt_network=&matt_device=&matt_creative=&matt_keyword=&matt_ad_position=&matt_ad_type=&matt_merchant_id=&matt_product_id=&matt_product_partition_id=&matt_target_id=&tracking_id=${config.mercadolivreId}`;
    }
    return product.url;
  } 
  
  if (product.platform === 'shopee') {
    if (config.shopeeId) {
      return `${product.url}${separator}af_id=${config.shopeeId}`;
    }
    return product.url;
  }

  if (product.platform === 'aliexpress') {
    if (config.aliexpressId) {
      return `${product.url}${separator}tracking_id=${config.aliexpressId}`;
    }
    return product.url;
  }

  if (product.platform === 'amazon') {
    if (config.amazonId) {
      return `${product.url}${separator}tag=${config.amazonId}`;
    }
    return product.url;
  }

  if (product.platform === 'lomadee') {
    if (config.lomadeeId) {
      return `${product.url}${separator}sourceId=${config.lomadeeId}`;
    }
    return product.url;
  }

  if (product.platform === 'awin') {
    if (config.awinId) {
      return `${product.url}${separator}pID=${config.awinId}`;
    }
    return product.url;
  }

  if (product.platform === 'rakuten') {
    if (config.rakutenId) {
      return `${product.url}${separator}sid=${config.rakutenId}`;
    }
    return product.url;
  }

  return product.url;
}

export const COPY_TEMPLATES = [
  { id: 'aida', name: 'AIDA', description: 'Atenção → Interesse → Desejo → Ação', icon: '🎯' },
  { id: 'pas', name: 'PAS', description: 'Problema → Agitação → Solução', icon: '💡' },
  { id: 'bab', name: 'BAB', description: 'Antes → Depois → Ponte', icon: '🌉' },
];
