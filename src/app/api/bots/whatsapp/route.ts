import { NextResponse } from 'next/server';
import { whatsappBot } from '@/lib/bots/whatsapp';

export async function GET() {
  const state = whatsappBot.getState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, groupId, product, template, affiliateConfig } = body;

    switch (action) {
      case 'start':
        await whatsappBot.initialize();
        // Wait a moment for QR to generate
        await new Promise(resolve => setTimeout(resolve, 3000));
        return NextResponse.json({
          success: true,
          message: 'Bot iniciando... escaneie o QR code',
          state: whatsappBot.getState(),
        });

      case 'stop':
        await whatsappBot.disconnect();
        return NextResponse.json({
          success: true,
          message: 'Bot desconectado',
          state: whatsappBot.getState(),
        });

      case 'get-groups':
        const groups = await whatsappBot.loadGroups();
        return NextResponse.json({ success: true, groups });

      case 'send-test':
        if (!groupId || !product) {
          return NextResponse.json(
            { success: false, message: 'groupId e product são obrigatórios' },
            { status: 400 }
          );
        }
        const log = await whatsappBot.sendToGroup(
          groupId,
          product,
          template || 'aida',
          affiliateConfig || { mercadolivreId: '', shopeeId: '' }
        );
        return NextResponse.json({ success: log.status === 'success', log });

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
