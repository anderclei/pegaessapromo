import { redirect } from 'next/navigation';
import { groupPoolService } from '@/lib/bots/group-pools';

export default async function EntrarCategoriaPage({ params }: { params: { categoria: string } }) {
  const { categoria } = params;
  
  // Tenta encontrar um grupo com vagas para a categoria solicitada no server-side
  const availableGroup = groupPoolService.findAvailableGroup(categoria);

  if (availableGroup && availableGroup.inviteLink) {
    // Redireciona diretamente para o link de convite do WhatsApp
    redirect(availableGroup.inviteLink);
  }

  // Se não encontrar grupo com vagas, mostra a página informativa
  return (
    <div className="main-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="settings-card" style={{ maxWidth: '450px', textAlign: 'center', padding: '3rem 2rem' }}>
        <img src="/logo.png" alt="Pega Essa Promo!" style={{ width: '180px', margin: '0 auto 2rem' }} />
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Grupos Lotados 😕
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
          No momento, todos os nossos grupos da categoria <strong style={{color: 'var(--accent-orange)'}}>{categoria}</strong> estão com a capacidade máxima atingida.
          <br /><br />
          Estamos providenciando novos grupos! Por favor, tente acessar novamente mais tarde para garantir sua vaga.
        </p>
        <a href="/" className="btn-save" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Ver Ofertas no Site
        </a>
      </div>
    </div>
  );
}
