const { Preference, Payment } = require('mercadopago');
const { mpClient, MP_ATIVO, MP_PUBLIC_KEY } = require('../config/mercadopago');
const { pool } = require('../config/db');
const { enviarEmailConfirmacaoCliente } = require('../services/pedidoEmails');

async function enviarEmailConfirmacaoSeAplicavel(numeroPedido) {
  try {
    const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE numero_pedido = ?', [numeroPedido]);
    if (pedidos.length === 0) return;
    const [itens] = await pool.query('SELECT * FROM pedido_itens WHERE pedido_id = ?', [pedidos[0].id]);
    await enviarEmailConfirmacaoCliente(pedidos[0], itens);
  } catch (err) {
    console.error('Falha ao enviar e-mail de confirmação de pagamento:', err.message);
  }
}

async function getConfig(req, res) {
  res.json({ ativo: MP_ATIVO, publicKey: MP_PUBLIC_KEY });
}

async function processarPagamento(req, res, next) {
  try {
    if (!MP_ATIVO) {
      return res.status(400).json({ error: 'Gateway de pagamento não configurado.' });
    }

    const { numero_pedido, formData } = req.body;
    if (!numero_pedido || !formData) {
      return res.status(400).json({ error: 'Dados de pagamento incompletos.' });
    }

    const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE numero_pedido = ?', [
      numero_pedido,
    ]);
    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    const pedido = pedidos[0];

    if (pedido.status !== 'pendente') {
      return res.status(400).json({ error: 'Este pedido já foi processado.' });
    }

    const payment = new Payment(mpClient);

    const corpoPagamento = {
      transaction_amount: Number(pedido.total),
      description: `Pedido Cristal Floricultura ${pedido.numero_pedido}`,
      external_reference: pedido.numero_pedido,
      payment_method_id: formData.payment_method_id,
      payer: formData.payer,
      notification_url: process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL}/api/pagamentos/webhook`
        : undefined,
    };

    if (formData.token) corpoPagamento.token = formData.token;
    if (formData.installments) corpoPagamento.installments = formData.installments;
    if (formData.issuer_id) corpoPagamento.issuer_id = formData.issuer_id;

    const resultado = await payment.create({
      body: corpoPagamento,
      requestOptions: { idempotencyKey: `${pedido.numero_pedido}-${Date.now()}` },
    });

    let novoStatus = 'pendente';
    if (resultado.status === 'approved') novoStatus = 'pago';
    else if (resultado.status === 'rejected') novoStatus = 'cancelado';

    await pool.query('UPDATE pedidos SET status = ?, mp_payment_id = ? WHERE id = ?', [
      novoStatus,
      String(resultado.id),
      pedido.id,
    ]);

    if (novoStatus === 'pago') {
      enviarEmailConfirmacaoSeAplicavel(pedido.numero_pedido).catch(() => {});
    }

    res.json({
      status: resultado.status,
      status_detail: resultado.status_detail,
      payment_id: resultado.id,
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64: resultado.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url: resultado.transaction_details?.external_resource_url || null,
    });
  } catch (err) {
    console.error('Erro ao processar pagamento:', err.message);
    next(
      Object.assign(new Error('Não foi possível processar o pagamento. Verifique os dados e tente novamente.'), {
        status: 502,
        expose: true,
      })
    );
  }
}

async function criarPreferenciaPagamento(pedido, itens) {
  const preference = new Preference(mpClient);

  const frontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
    ? process.env.FRONTEND_URL
    : 'http://localhost:8080';
  const ehUrlLocal = /localhost|127\.0\.0\.1/.test(frontendUrl);

  const items = itens.map((item) => ({
    title: item.nome_produto,
    quantity: item.quantidade,
    unit_price: Number(item.preco_unitario),
    currency_id: 'BRL',
  }));

  if (pedido.frete > 0) {
    items.push({ title: 'Frete', quantity: 1, unit_price: Number(pedido.frete), currency_id: 'BRL' });
  }

  const resultado = await preference.create({
    body: {
      items,
      external_reference: pedido.numero_pedido,
      payer: { name: pedido.cliente_nome, email: pedido.cliente_email || undefined },
      back_urls: {
        success: `${frontendUrl}/pedido-sucesso.html?numero=${pedido.numero_pedido}`,
        pending: `${frontendUrl}/pedido-sucesso.html?numero=${pedido.numero_pedido}`,
        failure: `${frontendUrl}/checkout.html?erro=pagamento`,
      },
      ...(ehUrlLocal ? {} : { auto_return: 'approved' }),
      notification_url: process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL}/api/pagamentos/webhook`
        : undefined,
    },
  });

  return { init_point: resultado.init_point, preference_id: resultado.id };
}

async function receberWebhook(req, res) {
  try {
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    const topic = req.query.type || req.body?.type;

    if (topic !== 'payment' || !paymentId) {
      return res.sendStatus(200);
    }

    const payment = new Payment(mpClient);
    const pagamento = await payment.get({ id: paymentId });

    const numeroPedido = pagamento.external_reference;
    if (!numeroPedido) return res.sendStatus(200);

    const [pedidoAtual] = await pool.query('SELECT status FROM pedidos WHERE numero_pedido = ?', [
      numeroPedido,
    ]);
    const statusAnterior = pedidoAtual[0]?.status;

    let novoStatus = null;
    if (pagamento.status === 'approved') novoStatus = 'pago';
    else if (pagamento.status === 'rejected') novoStatus = 'cancelado';

    if (novoStatus) {
      await pool.query(
        'UPDATE pedidos SET status = ?, mp_payment_id = ? WHERE numero_pedido = ?',
        [novoStatus, String(paymentId), numeroPedido]
      );

      if (novoStatus === 'pago' && statusAnterior !== 'pago') {
        enviarEmailConfirmacaoSeAplicavel(numeroPedido).catch(() => {});
      }
    } else {
      await pool.query('UPDATE pedidos SET mp_payment_id = ? WHERE numero_pedido = ?', [
        String(paymentId),
        numeroPedido,
      ]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao processar webhook do Mercado Pago:', err.message);
    res.sendStatus(200);
  }
}

module.exports = {
  getConfig,
  processarPagamento,
  criarPreferenciaPagamento,
  receberWebhook,
  MP_ATIVO,
};
