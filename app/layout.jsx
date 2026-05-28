import './globals.css';

export const metadata = {
  title: 'Dolce Bella System',
  description: 'Sistema de vendas, estoque e clientes Dolce Bella Atelier',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
