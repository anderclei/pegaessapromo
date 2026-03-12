import { whatsappBot } from './whatsapp';
import { instagramPoster } from './instagram';
import { ScheduleConfig, PostLog } from './types';
import { Product } from '../types';
import { scrapeMercadoLivre } from '../scrapers/mercadolivre';
import { scrapeShopee } from '../scrapers/shopee';

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
  private _affiliateConfig = { mercadolivreId: '', shopeeId: '' };

  get config() { return this._config; }
  get isRunning() { return this._isRunning; }
  get lastRun() { return this._lastRun; }

  configure(config: Partial<ScheduleConfig>): void {
    this._config = { ...this._config, ...config };
  }

  setGroups(groups: string[]): void {
    this._selectedGroups = groups;
  }

  setAffiliateConfig(config: { mercadolivreId: string; shopeeId: string }): void {
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
      // Fetch fresh products
      const [mlProducts, shopeeProducts] = await Promise.all([
        scrapeMercadoLivre('todos').catch(() => [] as Product[]),
        scrapeShopee('todos').catch(() => [] as Product[]),
      ]);

      let allProducts = [...mlProducts, ...shopeeProducts];

      // Sort by sales
      allProducts.sort((a, b) => b.sales - a.sales);

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
            instagramPoster.generatePost(
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
