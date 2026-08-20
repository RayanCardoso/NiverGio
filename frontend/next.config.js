/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Gera out/admin/index.html em vez de out/admin.html — assim o Apache da
  // HostGator serve /admin/ (com a barra) como diretório+index sem precisar
  // de reescrita nenhuma. Sem isso, "/admin" sem ".html" dá 404 no Apache.
  trailingSlash: true,
  async rewrites() {
    // Só vale em `next dev` (ignorado no build estático com output: 'export').
    // Padrão: o backend PHP rodando no Apache do XAMPP local. Pra apontar pra
    // API já publicada, mude API_PROXY_TARGET no .env.local da raiz.
    const target = process.env.API_PROXY_TARGET || 'http://localhost/nivergio-api'
    return [
      { source: '/api/:path*', destination: `${target}/:path*` },
    ]
  },
}

export default nextConfig
