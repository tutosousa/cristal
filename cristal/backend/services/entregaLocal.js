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
