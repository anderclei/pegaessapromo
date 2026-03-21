import { Product } from '../types';
import { generateAllCopies, buildAffiliateLink } from '../copywriter';
import { InstagramPostData } from './types';

class InstagramPoster {
  private _posts: InstagramPostData[] = [];

  get posts() { return this._posts; }

  async generatePost(
    product: Product,
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: any
  ): Promise<InstagramPostData> {
    const affiliateLink = buildAffiliateLink(product, affiliateConfig);
    const copies = await generateAllCopies(product, affiliateLink, affiliateConfig);
    const templateCopies = copies[template];
    const instaCopy = templateCopies.find((c: any) => c.platform === 'instagram');

    if (!instaCopy) {
      throw new Error('Template de Instagram não encontrado');
    }

    const post: InstagramPostData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      productTitle: product.title,
      caption: instaCopy.body,
      hashtags: instaCopy.hashtags,
      imageUrl: product.image,
      affiliateLink,
      createdAt: new Date().toISOString(),
    };

    // --- INSTAGRAM GRAPH API POSTING ---
    const igAccountId = affiliateConfig.igAccountId;
    const igToken = affiliateConfig.igAccessToken;

    if (igAccountId && igToken && product.image) {
       try {
          const finalCaption = `${instaCopy.body}\n\n👉 Compre pelo link na Bio ou nos Stories!\n\n${instaCopy.hashtags}`;
          
          console.log(`[INSTAGRAM] Iniciando postagem na API Oficial para: ${product.title.substring(0, 30)}...`);
          
          // Step 1: Create Media Container for FEED
          const mediaContainerRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media?image_url=${encodeURIComponent(product.image)}&caption=${encodeURIComponent(finalCaption)}&access_token=${igToken}`, {
             method: 'POST'
          });
          const mediaContainerData = await mediaContainerRes.json();
          
          if (mediaContainerData.error) {
             throw new Error(mediaContainerData.error.message);
          }
          
          const creationId = mediaContainerData.id;
          
          // Step 2: Publish Media Container
          const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish?creation_id=${creationId}&access_token=${igToken}`, {
             method: 'POST'
          });
          const publishData = await publishRes.json();
          
          if (publishData.error) {
             throw new Error(publishData.error.message);
          }
          
          console.log(`[INSTAGRAM] Post publicado com sucesso! Post ID: ${publishData.id}`);
          post.status = 'success';
          post.message = `Publicado (ID: ${publishData.id})`;
       } catch (e: any) {
          console.error(`[INSTAGRAM] Erro ao postar:`, e);
          post.status = 'error';
          post.message = `Erro: ${e.message}`;
       }
    } else {
       post.status = 'error';
       post.message = 'Chaves do Instagram ausentes ou sem imagem';
    }

    this._posts.unshift(post);

    // Keep only last 50 posts
    if (this._posts.length > 50) {
      this._posts = this._posts.slice(0, 50);
    }

    return post;
  }

  async generateMultiplePosts(
    products: Product[],
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: any
  ): Promise<InstagramPostData[]> {
    const results = [];
    for (const product of products) {
        results.push(await this.generatePost(product, template, affiliateConfig));
    }
    return results;
  }

  deletePost(postId: string): boolean {
    const initialLength = this._posts.length;
    this._posts = this._posts.filter(p => p.id !== postId);
    return this._posts.length < initialLength;
  }

  clearPosts(): void {
    this._posts = [];
  }

  getState() {
    return {
      posts: this._posts,
    };
  }
}

// Singleton
export const instagramPoster = new InstagramPoster();
