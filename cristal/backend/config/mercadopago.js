const { MercadoPagoConfig } = require('mercadopago');

const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN || '').trim();
const MP_ATIVO = Boolean(MP_ACCESS_TOKEN);
const MP_PUBLIC_KEY = (process.env.MP_PUBLIC_KEY || '').trim() || null;

const mpClient = MP_ATIVO
  ? new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 8000 },
    })
  : null;

module.exports = { mpClient, MP_ATIVO, MP_PUBLIC_KEY };
