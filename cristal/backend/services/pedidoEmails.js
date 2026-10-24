const { enviarEmailGenerico } = require('../config/email');

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
  return new Date(data).toLocaleString('pt-BR');
}

function montarListaProdutos(itens) {
  return itens.map((item) => {
    const variacao = [item.cor, item.tamanho].filter(Boolean).join(', ');
    return (
      `- ${item.nome_produto}${variacao ? ` (${variacao})` : ''}\n` +
      `  Quantidade: ${item.quantidade}\n` +
      `  Valor: ${formatarPreco(item.subtotal)}`
    );
  }).join('\n\n');
}

function montarEnderecoTexto(pedido) {
  if (pedido.tipo_entrega === 'entrega_local') {
    return (
      `Entrega local de flores — Cristal Floricultura\n` +
      `Cidade: ${pedido.cidade_entrega || '—'}\n` +
      `Ponto de referência: ${pedido.ponto_referencia || '—'}`
    );
  }

  if (pedido.tipo_entrega === 'combinado_atacado' || !pedido.endereco_rua) {
    return 'A combinar (pedido de atacado).';
  }

  return (
    `${pedido.endereco_rua}, ${pedido.endereco_numero || 's/n'}\n` +
    `Bairro: ${pedido.endereco_bairro || '—'}\n` +
    `Cidade: ${pedido.endereco_cidade || '—'}\n` +
    `Estado: ${pedido.endereco_estado || '—'}\n` +
    `CEP: ${pedido.endereco_cep || '—'}`
  );
}

async function enviarEmailNovoPedidoEmpresa(pedido, itens) {
  const emailEmpresa = (process.env.EMAIL_ADMIN || '').trim();
  if (!emailEmpresa) {
    console.log('📧 EMAIL_ADMIN não configurado — pulando aviso de novo pedido por e-mail (a notificação continua aparecendo no painel).');
    return;
  }

  const assunto = `Novo pedido recebido — Pedido ${pedido.numero_pedido}`;
  const corpo = `Novo pedido recebido!

Pedido: ${pedido.numero_pedido}

Cliente: ${pedido.cliente_nome}
E-mail: ${pedido.cliente_email || '—'}
Telefone: ${pedido.cliente_telefone}

Produtos:
${montarListaProdutos(itens)}

Subtotal: ${formatarPreco(pedido.subtotal)}
Frete: ${pedido.frete > 0 ? formatarPreco(pedido.frete) : 'Grátis'}
Total: ${formatarPreco(pedido.total)}

Pagamento: ${pedido.forma_pagamento || '—'}
Status: ${pedido.status}

Endereço de entrega:
${montarEnderecoTexto(pedido)}
`;

  try {
    await enviarEmailGenerico(emailEmpresa, assunto, corpo);
  } catch (err) {
    console.error('Falha ao enviar aviso de novo pedido pra empresa:', err.message);
  }
}

async function enviarEmailConfirmacaoCliente(pedido, itens) {
  if (!pedido.cliente_email) return;

  const assunto = `Pedido recebido — ${pedido.numero_pedido}`;
  const statusTexto = pedido.status === 'pago'
    ? 'Pago'
    : pedido.status === 'pendente'
    ? 'Aguardando pagamento'
    : pedido.status;

  const corpo = `Olá, ${pedido.cliente_nome.split(' ')[0]}!

Recebemos seu pedido ${pedido.numero_pedido}.

Confira os detalhes:

${montarListaProdutos(itens)}

Subtotal: ${formatarPreco(pedido.subtotal)}
Frete: ${pedido.frete > 0 ? formatarPreco(pedido.frete) : 'Grátis'}
Total: ${formatarPreco(pedido.total)}

Endereço de entrega:
${montarEnderecoTexto(pedido)}

Pagamento: ${pedido.forma_pagamento || '—'}
Status: ${statusTexto}
${pedido.status === 'pendente' ? '\nSe você escolheu Pix, finalize o pagamento na própria tela do checkout — não é necessário nenhuma ação aqui pelo e-mail.\n' : ''}
Data do pedido: ${formatarData(pedido.criado_em || new Date())}

Obrigado pela compra!
`;

  try {
    await enviarEmailGenerico(pedido.cliente_email, assunto, corpo);
  } catch (err) {
    console.error('Falha ao enviar confirmação de pedido pra cliente:', err.message);
  }
}

module.exports = { enviarEmailNovoPedidoEmpresa, enviarEmailConfirmacaoCliente };
