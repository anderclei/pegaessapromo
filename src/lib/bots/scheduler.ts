import { whatsappBot } from './whatsapp';
import { instagramPoster } from './instagram';
import { ScheduleConfig, PostLog } from './types';
import { Product } from '../types';
import { scrapeMercadoLivre } from '../scrapers/mercadolivre';
import { scrapeShopee } from '../scrapers/shopee';
import { getSettings } from '../settings';

class PostScheduler {
  private _config: ScheduleConfig = {
    enabled: false,
    intervalMinutes: 60,
    template: 'aida',
    platforms: {
      whatsapp: true,
      instagram: true,
    },
    maxPostsPerRun: 3,
  };

  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;
  private _lastRun: string | null = null;
  private _selectedGroups: string[] = [];
  private _affiliateConfig: any = { mercadolivreId: '', shopeeId: '', geminiKey: '', siteUrl: '' };

  get config() { return this._config; }
  get isRunning() { return this._isRunning; }
  get lastRun() { return this._lastRun; }

  configure(config: Partial<ScheduleConfig>): void {
    this._config = { ...this._config, ...config };
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

  async runPostingCycle(): Promise<PostLog[]> {
    const logs: PostLog[] = [];

    try {
      // Check time window (08:00 to 19:00)
      const now = new Date();
      const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const currentHour = brazilTime.getHours();
      
      if (currentHour < 8 || currentHour >= 19) {
        console.log('⏰ Fora do horário comercial (08:00 - 19:00). Pausando postagens.');
        return logs;
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

      // Fetch fresh products including Amazon
      const [mlProducts, shopeeProducts] = await Promise.all([
        scrapeMercadoLivre('todos').catch(() => [] as Product[]),
        scrapeShopee('todos').catch(() => [] as Product[]),
      ]);

      let allProducts = [...mlProducts, ...shopeeProducts];

      // Add Amazon hot products
      try {
        const { loadHotProducts } = require('../promotions');
        const hotData = await loadHotProducts();
        if (hotData) {
          const amzEletronicos = hotData['eletronicos'] || [];
          const amzGerais = hotData['ofertas_gerais'] || [];
          allProducts = [...allProducts, ...amzEletronicos, ...amzGerais];
        }
      } catch (e) {
        console.error('Erro ao ler hot_products.json:', e);
      }

      // Sort by discount or sales
      allProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0) || b.sales - a.sales);

      // Filter already posted
      allProducts = allProducts.filter(
        p => !whatsappBot.isProductAlreadyPosted(p.id)
      );

      // Take top N
      const productsToPost = allProducts.slice(0, this._config.maxPostsPerRun);

      if (productsToPost.length === 0) {
        console.log('📭 Nenhum produto novo para postar');
        // Clear history after all products have been posted to allow re-posting
        whatsappBot.clearPostedHistory();
        return logs;
      }

      // Post to WhatsApp
      if (this._config.platforms.whatsapp && this._selectedGroups.length > 0) {
        for (const product of productsToPost) {
          const productLogs = await whatsappBot.sendToMultipleGroups(
            this._selectedGroups,
            product,
            this._config.template,
            this._affiliateConfig
          );
          logs.push(...productLogs);

          // Delay between products (5-10 seconds)
          const delay = 5000 + Math.random() * 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
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

// Singleton
export const postScheduler = new PostScheduler();
