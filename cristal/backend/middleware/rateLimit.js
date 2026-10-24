const rateLimit = require('express-rate-limit');

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limitarCodigo = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limitarEnvioCodigo = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitos pedidos de código em pouco tempo. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limitarLogin, limitarCodigo, limitarEnvioCodigo };
