// Lógica do carrinho de compras da Cristal Floricultura.
//
// Existe UM único carrinho, guardado no localStorage do navegador do
// cliente. O cliente nunca escolhe "modo de compra" — ele só vê os
// produtos e o preço de cada um. Quando a quantidade de um item atinge o
// mínimo configurado para aquele produto no admin, o preço unitário cai
// automaticamente (é um desconto por quantidade, não uma seção separada
// do site) — isso é decidido em calcularItem() abaixo.
//
// Cada item do carrinho tem uma "chave" única que combina produto + tamanho
// + cor — assim, o mesmo produto em tamanhos ou cores diferentes vira
// linhas separadas no carrinho, em vez de se misturar.

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

// `variacao` é opcional: { tamanho, cor }
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
      // Vem sempre do cadastro do produto (nunca inferido aqui) — decide se
      // o checkout usa a entrega local de flores por cidade em vez do
      // Melhor Envio (ver checkout.html / carrinhoPossuiFlores abaixo).
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

// Calcula o preço unitário aplicável e o subtotal do item. Se a quantidade
// desse item sozinho atingir o mínimo configurado no produto, o preço por
// unidade cai automaticamente — sem nenhuma tela ou seção separada pra
// isso, é só um desconto por volume no mesmo carrinho.
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

// Regra de negócio da Cristal Floricultura: se PELO MENOS UM item do
// carrinho tem flores, o pedido inteiro usa a entrega local por cidade em
// vez do Melhor Envio (o checkout consulta esta função pra decidir qual UI
// de entrega mostrar). O backend recalcula e valida tudo de novo — isto
// aqui só decide o que a TELA mostra, nunca o valor do frete cobrado.
function carrinhoPossuiFlores() {
  return obterCarrinho().some((item) => item.possui_flores);
}

// Atualiza o contador visível no ícone do carrinho no cabeçalho (se existir na página).
function atualizarContadorCarrinho() {
  const contadorEl = document.getElementById('carrinho-contador');
  if (contadorEl) {
    contadorEl.textContent = contarItensCarrinho();
  }
}

document.addEventListener('DOMContentLoaded', () => atualizarContadorCarrinho());
