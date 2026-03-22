import { whatsappBot } from './whatsapp';
import { instagramPoster } from './instagram';
import { ScheduleConfig, PostLog, GroupCategory } from './types';
import { Product } from '../types';
import { scrapeMercadoLivre } from '../scrapers/mercadolivre';
import { scrapeShopee } from '../scrapers/shopee';
import { scrapeAmazon } from '../scrapers/amazon';
import { generateAllCopies } from '../copywriter';
import { getSettings } from '../settings';
import { loadHotProducts, saveHotProducts } from '../promotions';
import { gitPush } from '../git';

class PostScheduler {
  private _config: ScheduleConfig = {
    enabled: false,
    intervalMinutes: 60,
    template: 'aida',
    platforms: {
      whatsapp: true,
      instagram: true,
    },
    maxPostsPerRun: 1,
    startTime: '08:00',
    endTime: '19:00',
  };

  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;
  private _lastRun: string | null = null;
  private _selectedGroups: string[] = [];
  private _affiliateConfig: any = { mercadolivreId: '', shopeeId: '', geminiKey: '', siteUrl: '' };

  private _scraperQueue: Product[] = [];
  private _lastScrapeTime: number = 0;

  get config() { return this._config; }
  get isRunning() { return this._isRunning; }
  get lastRun() { return this._lastRun; }

  configure(config: Partial<ScheduleConfig>): void {
    const oldInterval = this._config.intervalMinutes;
    this._config = { ...this._config, ...config };
    
    // If the interval changed and it's already running, we need to restart the timer
    if (this._isRunning && oldInterval !== this._config.intervalMinutes) {
      if (this._intervalId) {
        clearInterval(this._intervalId);
      }
      this._intervalId = setInterval(
        () => this.runPostingCycle(),
        this._config.intervalMinutes * 60 * 1000
      );
      console.log(`⏰ Intervalo do agendamento atualizado para: a cada ${this._config.intervalMinutes} minutos`);
    }
  }

  setGroups(groups: string[]): void {
    this._selectedGroups = groups;
  }

  setAffiliateConfig(config: any): void {
    this._affiliateConfig = config;
  }

  start(): boolean {
    if (this._isRunning) return false;

    this._config.enabled = true;
    this._isRunning = true;

    // Run immediately
    this.runPostingCycle();

    // Set interval
    this._intervalId = setInterval(
      () => this.runPostingCycle(),
      this._config.intervalMinutes * 60 * 1000
    );

    console.log(`⏰ Agendamento iniciado: a cada ${this._config.intervalMinutes} minutos`);
    return true;
  }

  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._isRunning = false;
    this._config.enabled = false;
    console.log('⏹️ Agendamento parado');
  }

  // Send a single specific product manually (from Ofertas tab)
  async runSingleProduct(product: Product): Promise<PostLog[]> {
    if (this._selectedGroups.length === 0) {
      throw new Error('Nenhum grupo selecionado para envio');
    }
    let config = { ...this._affiliateConfig };
    if (!config.geminiKey) {
      try {
        const cloudSettings = await getSettings();
        if (cloudSettings) config = { ...config, ...cloudSettings };
      } catch (e) {}
    }
    console.log(`📤 Envio manual: ${product.title.substring(0, 50)}...`);
    const logs = await whatsappBot.sendToMultipleGroups(
      this._selectedGroups,
      product,
      this._config.template,
      config
    );
    return logs;
  }

  async runPostingCycle(force: boolean = false): Promise<PostLog[]> {
    const logs: PostLog[] = [];

    try {
      if (!force) {
        // Check time window
        const now = new Date();
        const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const currentHour = brazilTime.getHours();
        const currentMinutes = brazilTime.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinutes;

        const [startH, startM] = (this._config.startTime || '08:00').split(':').map(Number);
        const [endH, endM] = (this._config.endTime || '19:00').split(':').map(Number);
        const startInMinutes = startH * 60 + startM;
        const endInMinutes = endH * 60 + endM;
        
        if (currentTimeInMinutes < startInMinutes || currentTimeInMinutes >= endInMinutes) {
          console.log(`⏰ Fora do horário configurado (${this._config.startTime || '08:00'} - ${this._config.endTime || '19:00'}). Pausando postagens.`);
          return logs;
        }
      }

      // Ensure we have current settings (cloud fallback)
      if (!this._affiliateConfig.geminiKey || !this._affiliateConfig.amazonId) {
        try {
          const cloudSettings = await getSettings();
          if (cloudSettings) {
            this._affiliateConfig = { ...this._affiliateConfig, ...cloudSettings };
          }
        } catch (e) {
          console.error('Failed to load cloud settings for scheduler', e);
        }
      }

      const nowMs = Date.now();
      const needsToScrape = (nowMs - this._lastScrapeTime >= 55 * 60 * 1000) || this._scraperQueue.length === 0;

      let hotData: any = null;
      try {
        hotData = await loadHotProducts();
      } catch(e) {}

      // PHASE 1: Scrape Fresh Products (Lightning Deals + Bestsellers + Synced Cache)
      if (needsToScrape) {
        let allProducts: Product[] = [];
        const categories = this._selectedGroups
          .map(g => whatsappBot.groups.find(group => group.id === g)?.categories)
          .filter((c): c is GroupCategory[] => !!c)
          .flat();
      
      const uniqueCategories = Array.from(new Set(categories));
      
      // Always include real-time Lightning Deals for maximum freshness
      console.log('⚡ [SYNC] Buscando Ofertas Relâmpago em tempo real...');
      try {
        const lightning = await scrapeAmazon('todos', 'lightning');
        allProducts.push(...lightning);
      } catch (e) {}

      for (const cat of uniqueCategories) {
        console.log(`🔍 [SYNC] Buscando ofertas frescas para: ${cat}...`);
        try {
          const products = await scrapeAmazon(cat, 'bestsellers');
          allProducts.push(...products);
        } catch (e) {}
      }

      // Supplement with cached data to avoid empty runs
      try {
        hotData = await loadHotProducts();
        if (hotData) {
          const amzEletronicos = hotData['eletronicos'] || [];
          const amzGerais = hotData['ofertas_gerais'] || [];
          allProducts = [...allProducts, ...amzEletronicos, ...amzGerais];
        }
      } catch (e) {}

      // Supplement with other platforms
      try {
        const [ml, shp] = await Promise.all([
          scrapeMercadoLivre('todos').catch(() => []),
          scrapeShopee('todos').catch(() => [])
        ]);
        allProducts.push(...ml, ...shp);
      } catch (e) {}

      // Filter for "imperdíveis": High discount (15%+) or special deal types
      allProducts = allProducts.filter(p => {
        const hasHighDiscount = (p.discount || 0) >= 15;
        const isSpecialType = p.type === 'lightning' || p.type === 'super';
        return hasHighDiscount || isSpecialType;
      });

        // Sort by urgency: Lightning Deals first, then by discount amount
        allProducts.sort((a, b) => {
          const typePriority = (type?: string) => type === 'lightning' ? 2 : (type === 'super' ? 1 : 0);
          const priorityA = typePriority(a.type);
          const priorityB = typePriority(b.type);
          
          if (priorityA !== priorityB) return priorityB - priorityA;
          return (b.discount || 0) - (a.discount || 0);
        });

        this._scraperQueue = allProducts;
        this._lastScrapeTime = nowMs;
        console.log(`📡 [SCRAPER] Realizou uma nova busca pesada. Retornou ${allProducts.length} produtos para a fila.`);
      } else {
        console.log('📡 [SCRAPER] Usando ofertas da fila em cache (buscas ocorrem a cada 60 mins)...');
      }

      // Explicit global rejection filter to ensure no bad words slip through from cached JSON or other platforms
      const defaultBadWords = ['cabo', 'adaptador', 'fone com fio', 'fone intra-auricular com fio', 'capinha', 'película', 'carregador de parede'];
      const customForbidden = this._affiliateConfig.forbiddenWords || '';
      const badWords = customForbidden.trim() ? customForbidden.split(',').map((w: string) => w.trim().toLowerCase()).filter(Boolean) : defaultBadWords;

      const filteredProducts = this._scraperQueue.filter(p => {
        if (whatsappBot.isProductAlreadyPosted(p.id)) return false;
        
        const titleLower = p.title.toLowerCase();
        if (badWords.some((bw: string) => titleLower.includes(bw))) return false;
        
        return true;
      });

      // Take top N (quality over quantity)
      const productsToPost = filteredProducts.slice(0, this._config.maxPostsPerRun);

      // If we depleted the queue but still need products, force a scrape next time
      if (productsToPost.length === 0 && this._scraperQueue.length > 0) {
        // Queue is completely full of trash or already posted items
        this._scraperQueue = [];
      }

      // PHASE 2: GitHub Push & Vercel Trigger (Publicar no Vitrine)
      if (productsToPost.length > 0) {
        console.log('🔄 [2/4] Sincronizando com GitHub...');
        
        // Use current config including geminiKey
        let config = { ...this._affiliateConfig };
        if (!config.geminiKey) {
          try {
            const settings = await getSettings();
            if (settings) config = { ...config, ...settings };
          } catch (e) {}
        }

        // Ensure candidates have creative copy and are included in hot_products.json locally before push
        try {
          const hotData = await loadHotProducts() || {};
          const currentGerais: Product[] = hotData['ofertas_gerais'] || [];
          const currentIds = new Set(currentGerais.map((p: Product) => p.id));
          
          let added = 0;
          const productsWithCopies: Product[] = [];

          // Pre-generate copies for these specific products to be posted
          console.log(`🧠 Gerando copies para ${productsToPost.length} produtos do ciclo...`);
          for (const p of productsToPost) {
             const finalSiteUrl = config.siteUrl?.replace(/\/$/, '') || '';
             const siteLink = finalSiteUrl ? `${finalSiteUrl}/p/${p.id}` : p.url;
             
             try {
                const copies = await generateAllCopies(p, siteLink, config);
                const waBody = copies[this._config.template].find((c: any) => c.platform === 'whatsapp')?.body;
                productsWithCopies.push({ ...p, creativeCopy: waBody });
             } catch (e) {
                productsWithCopies.push(p);
             }
          }
          
          productsWithCopies.forEach(p => {
             if (!currentIds.has(p.id)) {
                currentGerais.unshift(p);
                added++;
             }
          });
          
          if (added > 0) {
            const updatedHot = { ...hotData, ofertas_gerais: currentGerais.slice(0, 50), lastSync: new Date().toISOString() };
            await saveHotProducts(updatedHot);
            
            // Push to GitHub
            console.log(`🚀 [3/4] Enviando ${added} ofertas COM COPY para o repositório...`);
            const gitRes = await gitPush(`AutoPost Prep (Com Copy) - ${added} ofertas - ${new Date().toLocaleTimeString()}`);
            
            if (gitRes.success) {
               console.log('✅ GitHub sincronizado! Aguardando deploy do Vercel (3-5 minutos)...');
               await new Promise(r => setTimeout(r, 180000)); 
            }
          }
        } catch (e) {
          console.error('[GIT] Falha no push durante agendamento:', e);
        }
      }

      if (productsToPost.length === 0) {
        console.log('📭 Nenhum produto novo para postar');
        // Ao invés de limpar todo o histórico e forçar spam repetido das mesmas ofertas,
        // apenas aguardamos as próximas ofertas aparecerem no site da Amazon na próxima hora.
        // Se a pessoa reiniciar o servidor, as ofertas também são "esquecidas".
        // whatsappBot.clearPostedHistory(); 
        return logs;
      }

      // For each product: PUBLISH on site first, then send WhatsApp message
      if (this._config.platforms.whatsapp && this._selectedGroups.length > 0) {
        // Ensure geminiKey is available in affiliateConfig
        let config = { ...this._affiliateConfig };
        if (!config.geminiKey) {
          try {
            const cloudSettings = await getSettings();
            if (cloudSettings) config = { ...config, ...cloudSettings };
          } catch (e) {}
        }

        for (const product of productsToPost) {
          // STEP 1: Publish to site (Supabase) BEFORE sending WhatsApp
          // This ensures the link /p/[id] is live when the user clicks it
          try {
            const currentHot = hotData || {};
            const existingGerais: Product[] = currentHot['ofertas_gerais'] || [];
            const existingIds = new Set(existingGerais.map((p: Product) => p.id));

            if (!existingIds.has(product.id)) {
              const updatedGerais = [product, ...existingGerais].slice(0, 100);
              hotData = { ...currentHot, ofertas_gerais: updatedGerais, lastSync: new Date().toISOString() };
              await saveHotProducts(hotData);
              console.log(`📤 [1/2] Produto publicado no site: ${product.title.substring(0, 50)}...`);
            }
          } catch (e) {
            console.error('Erro ao publicar produto no site antes do envio:', e);
          }

          // STEP 2: Send to WhatsApp with the now-live link
          console.log(`📱 [2/2] Enviando para o grupo: ${product.title.substring(0, 50)}...`);
          const productLogs = await whatsappBot.sendToMultipleGroups(
            this._selectedGroups,
            product,
            this._config.template,
            config
          );
          logs.push(...productLogs);

          // Delay between products (5-10 seconds)
          const delay = 5000 + Math.random() * 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`✅ Ciclo concluído: ${productsToPost.length} ofertas publicadas e enviadas.`);
      }

      // Generate Instagram posts
      if (this._config.platforms.instagram) {
        for (const product of productsToPost) {
          try {
            await instagramPoster.generatePost(
              product,
              this._config.template,
              this._affiliateConfig
            );
            logs.push({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              platform: 'instagram',
              productTitle: product.title,
              status: 'success',
              message: 'Post gerado com sucesso',
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            logs.push({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              platform: 'instagram',
              productTitle: product.title,
              status: 'error',
              message: error instanceof Error ? error.message : 'Erro desconhecido',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      this._lastRun = new Date().toISOString();
    } catch (error) {
      console.error('Erro no ciclo de postagem:', error);
    }

    return logs;
  }

  getState() {
    return {
      config: this._config,
      isRunning: this._isRunning,
      lastRun: this._lastRun,
      selectedGroups: this._selectedGroups,
    };
  }
}

// Forçar Singleton Único no Next.js (mesmo em dev com Fast Refresh)
const globalForScheduler = globalThis as unknown as { postScheduler: PostScheduler | undefined };
export const postScheduler = globalForScheduler.postScheduler ?? new PostScheduler();

if (process.env.NODE_ENV !== 'production') {
  globalForScheduler.postScheduler = postScheduler;
}
