require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { testConnection } = require('./config/db');
const { testarConexaoEmail } = require('./config/email');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInputs } = require('./middleware/sanitize');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const financeRoutes = require('./routes/financeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const melhorEnvioRoutes = require('./routes/melhorEnvioRoutes');
const contentImageRoutes = require('./routes/contentImageRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(sanitizeInputs);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/clientes', customerRoutes);
app.use('/api/categorias', categoryRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/pedidos', orderRoutes);
app.use('/api/financeiro', financeRoutes);
app.use('/api/pagamentos', paymentRoutes);
app.use('/api/frete', melhorEnvioRoutes);
app.use('/api/conteudo-imagens', contentImageRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Cristal Floricultura API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cristal Floricultura API' });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 20) {
  console.warn(
    '\n⚠️  AVISO DE SEGURANÇA: JWT_SECRET ausente ou muito curto no .env. ' +
    'Gere uma chave longa e aleatória antes de publicar o site (veja o .env.example).\n'
  );
}

const iniciarServidor = async () => {
  console.log(`\nAPI Cristal Floricultura rodando em http://localhost:${PORT}`);
  await testConnection();
  await testarConexaoEmail();

  const { MP_ATIVO, MP_PUBLIC_KEY } = require('./config/mercadopago');
  if (MP_ATIVO) {
    console.log(
      `💳 Mercado Pago configurado (Access Token: ${(process.env.MP_ACCESS_TOKEN || '').trim().length} caracteres, Public Key: ${(MP_PUBLIC_KEY || '').length} caracteres)`
    );
  } else {
    console.log('💳 Mercado Pago NÃO configurado — checkout rodando em modo simulado (aprova na hora, sem cobrança real).');
  }

  const { MELHOR_ENVIO_CONFIGURADO, ACCESS_TOKEN_DIRETO, CLIENT_ID: ME_CLIENT_ID, obterRedirectUri } = require('./config/melhorEnvio');
  if (ACCESS_TOKEN_DIRETO) {
    console.log(`📦 Melhor Envio configurado via Token de Acesso Direto (${ACCESS_TOKEN_DIRETO.length} caracteres) — não precisa de OAuth.`);
  } else if (MELHOR_ENVIO_CONFIGURADO) {
    console.log(`📦 Melhor Envio configurado via OAuth2 (Client ID: ${ME_CLIENT_ID.length} caracteres)`);
    console.log(`📦 URL de callback usada: ${obterRedirectUri()}`);
  } else {
    console.log('📦 Melhor Envio NÃO configurado — frete rodando em modo simulado (grátis).');
  }
};

if (!process.env.VERCEL) {
  app.listen(PORT, iniciarServidor);
}

module.exports = app;
