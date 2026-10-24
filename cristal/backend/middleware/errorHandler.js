function errorHandler(err, req, res, next) {
  console.error('Erro não tratado:', err);

  const status = err.status || 500;
  const message = err.expose
    ? err.message
    : 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';

  res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

module.exports = { errorHandler, notFoundHandler };
