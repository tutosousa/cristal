// Entrega local de flores — Cristal Floricultura (Surubim - PE).
//
// Quando o carrinho tem pelo menos um produto com `possui_flores = 1`, o
// pedido INTEIRO passa a usar este sistema de entrega por cidade, em vez
// do Melhor Envio (ver orderController.js). As cidades e valores abaixo
// são a ÚNICA fonte de verdade dos valores de frete desse fluxo — o
// backend nunca aceita um valor de frete vindo do navegador.
//
// IMPORTANTE: esta lista só deve ser alterada aqui. O front-end (checkout)
// consulta a rota pública GET /api/pedidos/cidades-entrega para exibir as
// mesmas opções, então os dois lados nunca ficam dessincronizados.

const CIDADES_ENTREGA_FLORES = [
  { cidade: 'Bom Jardim - PE', valor: 60.0 },
  { cidade: 'João Alfredo - PE', valor: 60.0 },
  { cidade: 'Limoeiro - PE', valor: 80.0 },
  { cidade: 'Vertente do Lério - PE', valor: 50.0 },
  { cidade: 'Vertentes / Taquaritinga do Norte - PE', valor: 60.0 },
  { cidade: 'Orobó - PE', valor: 60.0 },
  { cidade: 'Encruzilhada - PE', valor: 40.0 },
  { cidade: 'Frei Miguelinho - PE', valor: 60.0 },
  { cidade: 'Santa Maria do Cambucá - PE', valor: 50.0 },
  { cidade: 'Recife - PE', valor: 100.0 },
];

const NOME_CIDADE_RECIFE = 'Recife - PE';
const PONTO_REFERENCIA_PADRAO = 'Centro';

function listarCidadesEntrega() {
  // Cópia defensiva — quem chamar não pode mutar a lista original.
  return CIDADES_ENTREGA_FLORES.map((c) => ({ ...c }));
}

function buscarCidadeEntrega(nomeCidade) {
  return CIDADES_ENTREGA_FLORES.find(
    (c) => c.cidade.toLowerCase() === String(nomeCidade || '').trim().toLowerCase()
  ) || null;
}

function cidadeExigePontoReferencia(nomeCidade) {
  const cidade = buscarCidadeEntrega(nomeCidade);
  return Boolean(cidade) && cidade.cidade === NOME_CIDADE_RECIFE;
}

// Separa "Bom Jardim - PE" em { municipio: "Bom Jardim", uf: "PE" } pra
// preencher os campos de endereço tradicionais do pedido (endereco_cidade /
// endereco_estado), que continuam existindo pro admin e pros e-mails.
function separarMunicipioUf(nomeCidadeCompleto) {
  const partes = String(nomeCidadeCompleto || '').split(' - ');
  if (partes.length === 2) {
    return { municipio: partes[0].trim(), uf: partes[1].trim().toUpperCase() };
  }
  return { municipio: nomeCidadeCompleto || null, uf: 'PE' };
}

module.exports = {
  CIDADES_ENTREGA_FLORES,
  NOME_CIDADE_RECIFE,
  PONTO_REFERENCIA_PADRAO,
  listarCidadesEntrega,
  buscarCidadeEntrega,
  cidadeExigePontoReferencia,
  separarMunicipioUf,
};
