import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pega Essa Promo! — Ofertas Quentes + Copys para Afiliados",
  description: "Descubra as melhores promoções do Mercado Livre e Shopee. Gere copys profissionais e poste automaticamente nos seus grupos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="header">
          <div className="header-inner">
            <a href="/" className="logo">
              <img src="/logo.png" alt="Pega Essa Promo!" className="logo-image" />
            </a>
            <nav className="header-nav">
              <a href="/" className="nav-link active">📊 Dashboard</a>
              <a href="/bots" className="nav-link">🤖 Bots</a>
              <a href="/configuracoes" className="nav-link">⚙️ Configurações</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
