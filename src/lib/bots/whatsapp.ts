import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { BotStatus, WhatsAppGroup, PostLog } from './types';
import { Product } from '../types';
import { generateAllCopies, buildAffiliateLink } from '../copywriter';
import { savePromotion } from '../promotions';
import { getSettings } from '../settings';

class WhatsAppBot {
  private client: Client | null = null;
  private _status: BotStatus = 'disconnected';
  private _qrCode: string | null = null;
  private _groups: WhatsAppGroup[] = [];
  private _connectedPhone: string | undefined;
  private _logs: PostLog[] = [];
  private _postedProductIds: Set<string> = new Set();

  get status() { return this._status; }
  get qrCode() { return this._qrCode; }
  get groups() { return this._groups; }
  get connectedPhone() { return this._connectedPhone; }
  get logs() { return this._logs; }
  get postedProductIds() { return Array.from(this._postedProductIds); }

  async initialize(): Promise<void> {
    if (this.client) {
      await this.client.destroy().catch(() => {});
    }

    this._status = 'connecting';
    this._qrCode = null;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true, // headless: true is more stable on Windows than "new" for this lib
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-extensions',
        ],
      },
      authTimeoutMs: 60000, // Increase to 60s
      qrMaxRetries: 10,
    });

    this.client.on('qr', async (qr: string) => {
      try {
        this._qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        this._status = 'qr_ready';
      } catch (err) {
        console.error('Erro ao gerar QR code:', err);
      }
    });

    this.client.on('ready', async () => {
      this._status = 'connected';
      this._qrCode = null;
      console.log('✅ WhatsApp Bot conectado!');

      // Get phone info
      const info = this.client?.info;
      if (info) {
        this._connectedPhone = info.wid.user;
      }

      // Load groups
      await this.loadGroups();
    });

    this.client.on('disconnected', () => {
      this._status = 'disconnected';
      this._qrCode = null;
      this._groups = [];
      console.log('❌ WhatsApp Bot desconectado');
    });

    this.client.on('auth_failure', () => {
      this._status = 'error';
      console.error('❌ Falha na autenticação do WhatsApp');
    });

    try {
      console.log('⏳ Iniciando motor do WhatsApp (Puppeteer)...');
      await this.client.initialize();
    } catch (error) {
      this._status = 'error';
      console.error('CRITICAL: Erro ao inicializar WhatsApp:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
    }
  }

  async loadGroups(): Promise<WhatsAppGroup[]> {
    if (!this.client || this._status !== 'connected') {
      return [];
    }

    try {
      const chats = await this.client.getChats();
      const groupChats = chats.filter(chat => chat.isGroup);

      this._groups = await Promise.all(
        groupChats.map(async (chat) => {
          const groupChat = chat as unknown as {
            id: { _serialized: string };
            name: string;
            participants: Array<{ id: { _serialized: string }; isAdmin: boolean }>;
          };

          const myId = this.client?.info?.wid?._serialized || '';
          const me = groupChat.participants?.find(
            (p) => p.id._serialized === myId
          );

          return {
            id: groupChat.id._serialized,
            name: chat.name,
            participantsCount: groupChat.participants?.length || 0,
            isAdmin: me?.isAdmin || false,
            categories: ['todos'],
          };
        })
      );

      return this._groups;
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      return [];
    }
  }

  async sendToGroup(
    groupId: string,
    product: Product,
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: any
  ): Promise<PostLog> {
    const log: PostLog = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      platform: 'whatsapp',
      productTitle: product.title,
      groupName: this._groups.find(g => g.id === groupId)?.name || groupId,
      status: 'success',
      timestamp: new Date().toISOString(),
    };

    if (!this.client || this._status !== 'connected') {
      log.status = 'error';
      log.message = 'Bot não está conectado';
      this._logs.unshift(log);
      return log;
    }

    try {
      // Always ensure geminiKey is loaded from cloud settings
      let config = { ...affiliateConfig };
      if (!config.geminiKey) {
        try {
          const cloudSettings = await getSettings();
          if (cloudSettings) config = { ...config, ...cloudSettings };
        } catch (e) {
          console.error('Falha ao carregar geminiKey das settings:', e);
        }
      }

      // Build the affiliate link for this product
      const affiliateProductLink = buildAffiliateLink(product, config);

      // Save promotion to Supabase so the /p/[id] page works
      let promotionId = product.id;
      if (config.siteUrl) {
        try {
          promotionId = await savePromotion(product, affiliateProductLink);
        } catch (e) {
          console.error('Erro ao salvar promoção no Supabase, usando ID direto:', e);
        }
      }

      // Build the site link using the saved promotion ID
      const siteLink = config.siteUrl
        ? `${config.siteUrl}/p/${promotionId}`
        : affiliateProductLink;

      // Generate copy (Gemini if key available, fallback to template)
      const copies = await generateAllCopies(product, siteLink, config);
      const templateCopies = copies[template];
      const whatsappCopy = templateCopies.find((c: any) => c.platform === 'whatsapp');

      if (!whatsappCopy) {
        throw new Error('Template de WhatsApp não encontrado');
      }

      // Try to send with image using fetch with browser-like headers
      let sentWithImage = false;
      if (product.image && product.image.startsWith('http')) {
        try {
          const imgResponse = await fetch(product.image, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'Referer': 'https://www.amazon.com.br/',
            },
          });
          if (imgResponse.ok) {
            const buffer = Buffer.from(await imgResponse.arrayBuffer());
            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
            const base64 = buffer.toString('base64');
            const media = new MessageMedia(contentType, base64, 'product.jpg');
            await this.client.sendMessage(groupId, media, { caption: whatsappCopy.body });
            sentWithImage = true;
          }
        } catch (imgErr) {
          console.warn('Falha ao baixar imagem via fetch, tentando MessageMedia.fromUrl:', imgErr);
        }

        // Second attempt: MessageMedia.fromUrl
        if (!sentWithImage) {
          try {
            const media = await MessageMedia.fromUrl(product.image, { unsafeMime: true });
            await this.client.sendMessage(groupId, media, { caption: whatsappCopy.body });
            sentWithImage = true;
          } catch (urlErr) {
            console.warn('Falha em MessageMedia.fromUrl, enviando apenas texto:', urlErr);
          }
        }
      }

      // Final fallback: text only
      if (!sentWithImage) {
        await this.client.sendMessage(groupId, whatsappCopy.body);
      }

      log.status = 'success';
      log.message = sentWithImage ? 'Mensagem com imagem enviada com sucesso' : 'Mensagem enviada (sem imagem)';
      this._postedProductIds.add(product.id);
    } catch (error) {
      log.status = 'error';
      log.message = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    this._logs.unshift(log);
    if (this._logs.length > 100) {
      this._logs = this._logs.slice(0, 100);
    }

    return log;
  }

  async sendToMultipleGroups(
    groupIds: string[],
    product: Product,
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: any
  ): Promise<PostLog[]> {
    const logs: PostLog[] = [];

    for (const groupId of groupIds) {
      const log = await this.sendToGroup(groupId, product, template, affiliateConfig);
      logs.push(log);

      // Random delay between 2-5 seconds to simulate human behavior
      const delay = 2000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return logs;
  }

  isProductAlreadyPosted(productId: string): boolean {
    return this._postedProductIds.has(productId);
  }

  clearPostedHistory(): void {
    this._postedProductIds.clear();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('Erro ao desconectar:', error);
      }
      this.client = null;
      this._status = 'disconnected';
      this._qrCode = null;
      this._groups = [];
    }
  }

  getState() {
    return {
      status: this._status,
      qrCode: this._qrCode,
      groups: this._groups,
      connectedPhone: this._connectedPhone,
    };
  }
}

// Singleton
export const whatsappBot = new WhatsAppBot();
