import { NextResponse } from 'next/server';
import { instagramPoster } from '@/lib/bots/instagram';

export async function GET() {
  const state = instagramPoster.getState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, product, products, template, affiliateConfig, postId } = body;

    switch (action) {
      case 'generate':
        if (!product) {
          return NextResponse.json(
            { success: false, message: 'product é obrigatório' },
            { status: 400 }
          );
        }
        const post = instagramPoster.generatePost(
          product,
          template || 'aida',
          affiliateConfig || { mercadolivreId: '', shopeeId: '' }
        );
        return NextResponse.json({ success: true, post });

      case 'generate-multiple':
        if (!products || !Array.isArray(products)) {
          return NextResponse.json(
            { success: false, message: 'products (array) é obrigatório' },
            { status: 400 }
          );
        }
        const posts = instagramPoster.generateMultiplePosts(
          products,
          template || 'aida',
          affiliateConfig || { mercadolivreId: '', shopeeId: '' }
        );
        return NextResponse.json({ success: true, posts });

      case 'delete':
        if (!postId) {
          return NextResponse.json(
            { success: false, message: 'postId é obrigatório' },
            { status: 400 }
          );
        }
        const deleted = instagramPoster.deletePost(postId);
        return NextResponse.json({ success: deleted });

      case 'clear':
        instagramPoster.clearPosts();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { success: false, message: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
