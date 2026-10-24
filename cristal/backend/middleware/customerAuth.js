const jwt = require('jsonwebtoken');

function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Você precisa entrar na sua conta para continuar.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Token inválido para esta operação.' });
    }
    req.cliente = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

function attachCustomerIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.tipo === 'cliente') {
        req.cliente = decoded;
      }
    } catch (err) {
    }
  }
  next();
}

module.exports = { requireCustomerAuth, attachCustomerIfPresent };
