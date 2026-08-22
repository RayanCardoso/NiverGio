/** @type {import('next').NextConfig} */

// O proxy /api só existe no `next dev`. Com output: 'export' o Next ignora
// rewrites e avisa em toda build — por isso a chave nem entra no config fora
// do dev. Em produção quem atende /api é o próprio Apache da HostGator, que
// serve o backend PHP no mesmo domínio.
const isDev = process.env.NODE_ENV === 'development'

// Padrão: o backend PHP rodando no Apache do XAMPP local — a API responde em
// /nivergio-api/backend/, a raiz do virtual host serve o repositório inteiro.
// Pra apontar pra API já publicada, mude API_PROXY_TARGET no
// frontend/.env.local.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost/nivergio-api/backend'

const nextConfig = {
  output: 'export',
  // Gera out/admin/index.html em vez de out/admin.html — assim o Apache da
  // HostGator serve /admin/ (com a barra) como diretório+index sem precisar
  // de reescrita nenhuma. Sem isso, "/admin" sem ".html" dá 404 no Apache.
  trailingSlash: true,
  ...(isDev && {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: `${apiTarget}/:path*` },
      ]
    },
  }),
}

export default nextConfig
