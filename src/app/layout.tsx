import type { Metadata } from "next";
import "./globals.css";
import HeaderWrapper from "@/components/HeaderWrapper";

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
        <HeaderWrapper />
        {children}
      </body>
    </html>
  );
}
