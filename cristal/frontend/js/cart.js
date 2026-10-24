const CARRINHO_STORAGE_KEY = 'cristal_carrinho';

function gerarChaveItem(produtoId, tamanho, cor) {
  return `${produtoId}|${tamanho || ''}|${cor || ''}`;
}

function obterCarrinho() {
  try {
    const dados = localStorage.getItem(CARRINHO_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (e) {
    return [];
  }
}

function salvarCarrinho(itens) {
  localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens));
  atualizarContadorCarrinho();
}

function adicionarAoCarrinho(produto, quantidade, variacao = {}) {
  const tamanho = variacao.tamanho || null;
  const cor = variacao.cor || null;
  const chave = gerarChaveItem(produto.id, tamanho, cor);

  const carrinho = obterCarrinho();
  const existente = carrinho.find((item) => item.chave === chave);

  if (existente) {
    existente.quantidade += quantidade;
  } else {
    carrinho.push({
      chave,
      produto_id: produto.id,
      nome: produto.nome,
      tamanho,
      cor,
      preco_varejo: Number(produto.preco_varejo),
      preco_atacado: produto.preco_atacado ? Number(produto.preco_atacado) : null,
      quantidade_minima_atacado: produto.quantidade_minima_atacado || 50,
      imagem_url: produto.imagem_url,
      possui_flores: Boolean(produto.possui_flores),
      quantidade,
    });
  }

  salvarCarrinho(carrinho);
}

function atualizarQuantidade(chave, novaQuantidade) {
  let carrinho = obterCarrinho();
  if (novaQuantidade <= 0) {
    carrinho = carrinho.filter((item) => item.chave !== chave);
  } else {
    const item = carrinho.find((i) => i.chave === chave);
    if (item) item.quantidade = novaQuantidade;
  }
  salvarCarrinho(carrinho);
  return carrinho;
}

function removerDoCarrinho(chave) {
  const carrinho = obterCarrinho().filter((item) => item.chave !== chave);
  salvarCarrinho(carrinho);
  return carrinho;
}

function limparCarrinho() {
  salvarCarrinho([]);
}

function calcularItem(item) {
  const precoComDesconto =
    item.preco_atacado && item.quantidade >= item.quantidade_minima_atacado;
  const precoUnitario = precoComDesconto ? item.preco_atacado : item.preco_varejo;
  return {
    ...item,
    precoComDesconto,
    precoUnitario,
    subtotal: precoUnitario * item.quantidade,
  };
}

function calcularSubtotalCarrinho() {
  return obterCarrinho()
    .map((item) => calcularItem(item))
    .reduce((soma, item) => soma + item.subtotal, 0);
}

function contarItensCarrinho() {
  return obterCarrinho().reduce((soma, item) => soma + item.quantidade, 0);
}

function carrinhoPossuiFlores() {
  return obterCarrinho().some((item) => item.possui_flores);
}

function atualizarContadorCarrinho() {
  const contadorEl = document.getElementById('carrinho-contador');
  if (contadorEl) {
    contadorEl.textContent = contarItensCarrinho();
  }
}

document.addEventListener('DOMContentLoaded', () => atualizarContadorCarrinho());
