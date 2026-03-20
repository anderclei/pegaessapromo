import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function gitPush(message: string = 'Update offers'): Promise<{ success: boolean; output: string }> {
  try {
    console.log('[GIT] Iniciando commit e push...');
    
    // Add all source code and data changes to ensure Vercel reflects everything
    await execPromise('git add src/ data/');
    
    // Check if there are changes
    const { stdout: status } = await execPromise('git status --porcelain');
    if (!status) {
      console.log('[GIT] Sem alterações para commitar.');
      return { success: true, output: 'No changes' };
    }

    await execPromise(`git commit -m "${message}"`);
    // Pull first just in case to avoid rejections
    try { await execPromise('git pull origin master --rebase'); } catch (e) {}
    
    const { stdout: pushOutput } = await execPromise('git push origin master');
    
    console.log('[GIT] Push concluído com sucesso!');
    return { success: true, output: pushOutput };
  } catch (error) {
    console.error('[GIT] Erro ao realizar push:', error);
    return { success: false, output: (error as Error).message };
  }
}
