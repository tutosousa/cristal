const ACCESS_TOKEN_DIRETO = (process.env.MELHOR_ENVIO_ACCESS_TOKEN || '').trim();
const CLIENT_ID = (process.env.MELHOR_ENVIO_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.MELHOR_ENVIO_CLIENT_SECRET || '').trim();
const CEP_ORIGEM = (process.env.MELHOR_ENVIO_CEP_ORIGEM || '').trim();

const BASE_URL = 'https://melhorenvio.com.br';
const AUTHORIZE_URL = `${BASE_URL}/oauth/authorize`;
const TOKEN_URL = `${BASE_URL}/oauth/token`;
const API_BASE_URL = `${BASE_URL}/api/v2`;

const SCOPES = [
  'shipping-calculate',
  'shipping-companies',
  'cart-read',
  'cart-write',
  'shipping-checkout',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'ecommerce-shipping',
].join(' ');

function obterRedirectUri() {
  const backendUrl = (process.env.BACKEND_URL || '').trim();
  if (!backendUrl) return null;
  const backendUrlLimpo = backendUrl.replace(/\/+$/, '');
  return `${backendUrlLimpo}/api/frete/melhor-envio/callback`;
}

const MELHOR_ENVIO_CONFIGURADO = Boolean(
  (ACCESS_TOKEN_DIRETO && CEP_ORIGEM) ||
  (CLIENT_ID && CLIENT_SECRET && CEP_ORIGEM && obterRedirectUri())
);

module.exports = {
  ACCESS_TOKEN_DIRETO,
  CLIENT_ID,
  CLIENT_SECRET,
  CEP_ORIGEM,
  BASE_URL,
  AUTHORIZE_URL,
  TOKEN_URL,
  API_BASE_URL,
  SCOPES,
  obterRedirectUri,
  MELHOR_ENVIO_CONFIGURADO,
};
