import { NextResponse } from 'next/server';
import { whatsappBot } from '@/lib/bots/whatsapp';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

async function killChromeProcesses(): Promise<{ killed: number; error?: string }> {
  try {
    // Kill any orphaned chrome/chromium processes started by puppeteer
    if (process.platform === 'win32') {
      // On Windows, kill chrome processes that are running headlessly
      await execAsync('taskkill /F /IM chrome.exe /T').catch(() => {});
    } else {
      await execAsync("pkill -f 'chrome.*--headless' || true").catch(() => {});
      await execAsync("pkill -f 'chromium.*--headless' || true").catch(() => {});
    }
    return { killed: 1 };
  } catch (e) {
    return { killed: 0, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

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

      case 'clear-session':
        console.log('[Bot] Limpando sessão (excluindo .wwebjs_auth)...');
        await whatsappBot.disconnect().catch(() => {});
        await killChromeProcesses();
        try {
          const authPath = path.join(process.cwd(), '.wwebjs_auth');
          if (fs.existsSync(authPath)) {
            await fs.promises.rm(authPath, { recursive: true, force: true });
          }
        } catch (err: any) {
          console.error('[Bot] Erro ao excluir .wwebjs_auth:', err);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        await whatsappBot.initialize();
        await new Promise(resolve => setTimeout(resolve, 3000));
        return NextResponse.json({
          success: true,
          message: 'Sessão limpa e bot reiniciado. Aguarde o QR Code.',
          state: whatsappBot.getState(),
        });

      case 'sync-groups': {
        const groups = await whatsappBot.syncGroupsFromPhone();
        try {
          const { getSettings, saveSettings } = await import('@/lib/settings');
          const currentSettings = await getSettings();
          if (currentSettings) {
            await saveSettings({ ...currentSettings, fixedWhatsAppGroups: groups });
            await whatsappBot.loadGroups(); // Atualiza a memória do bot!
          }
        } catch (e) {
          console.error("Erro ao salvar grupos no DB", e);
        }
        return NextResponse.json({ success: true, groups });
      }

      case 'kill-process':
        // Only kill processes, do not restart
        await whatsappBot.disconnect().catch(() => {});
        const killResult = await killChromeProcesses();
        return NextResponse.json({
          success: true,
          message: `Processo encerrado. ${killResult.error ? 'Aviso: ' + killResult.error : ''}`,
          state: whatsappBot.getState(),
        });

      case 'force-restart':
        // Step 1: Disconnect the bot gracefully
        console.log('[Bot] Forçando reinício — desconectando...');
        await whatsappBot.disconnect().catch(() => {});

        // Step 2: Kill any zombie Chrome processes
        console.log('[Bot] Matando processos Chrome órfãos...');
        await killChromeProcesses();

        // Step 3: Short pause before reinitializing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Re-initialize the bot
        console.log('[Bot] Reiniciando bot...');
        await whatsappBot.initialize();
        await new Promise(resolve => setTimeout(resolve, 3000));

        return NextResponse.json({
          success: true,
          message: 'Bot reiniciado com sucesso. Aguarde o QR Code.',
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
