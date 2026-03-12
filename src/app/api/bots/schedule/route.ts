import { NextResponse } from 'next/server';
import { postScheduler } from '@/lib/bots/scheduler';
import { whatsappBot } from '@/lib/bots/whatsapp';

export async function GET() {
  return NextResponse.json({
    ...postScheduler.getState(),
    logs: whatsappBot.logs,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, groups, affiliateConfig } = body;

    switch (action) {
      case 'start':
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        if (config) postScheduler.configure(config);
        const started = postScheduler.start();
        return NextResponse.json({
          success: started,
          message: started ? 'Agendamento iniciado' : 'Agendamento já está ativo',
          state: postScheduler.getState(),
        });

      case 'stop':
        postScheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Agendamento parado',
          state: postScheduler.getState(),
        });

      case 'configure':
        if (config) postScheduler.configure(config);
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        return NextResponse.json({
          success: true,
          state: postScheduler.getState(),
        });

      case 'run-now':
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        const logs = await postScheduler.runPostingCycle();
        return NextResponse.json({ success: true, logs });

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
