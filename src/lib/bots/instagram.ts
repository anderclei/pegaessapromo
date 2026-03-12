import { Product } from '../types';
import { generateAllCopies, buildAffiliateLink } from '../copywriter';
import { InstagramPostData } from './types';

class InstagramPoster {
  private _posts: InstagramPostData[] = [];

  get posts() { return this._posts; }

  generatePost(
    product: Product,
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: { mercadolivreId: string; shopeeId: string }
  ): InstagramPostData {
    const affiliateLink = buildAffiliateLink(product, affiliateConfig);
    const copies = generateAllCopies(product, affiliateLink);
    const templateCopies = copies[template];
    const instaCopy = templateCopies.find(c => c.platform === 'instagram');

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

    this._posts.unshift(post);

    // Keep only last 50 posts
    if (this._posts.length > 50) {
      this._posts = this._posts.slice(0, 50);
    }

    return post;
  }

  generateMultiplePosts(
    products: Product[],
    template: 'aida' | 'pas' | 'bab',
    affiliateConfig: { mercadolivreId: string; shopeeId: string }
  ): InstagramPostData[] {
    return products.map(product =>
      this.generatePost(product, template, affiliateConfig)
    );
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
