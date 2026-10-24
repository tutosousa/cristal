const CHAVES_CRISTAL = [
  { chave: 'hero_principal', label: 'Banner principal (Hero da home)' },
  { chave: 'destaque_presentes', label: 'Destaque — "Presentes para toda ocasião"' },
  { chave: 'destaque_flores', label: 'Destaque — "Flores selecionadas todos os dias"' },
];

const CHAVES_PAN_CRISTAL = [
  { chave: 'hero_principal', label: 'Banner principal (Hero)' },
  { chave: 'hero_miniatura_1', label: 'Miniatura do hero — Pão' },
  { chave: 'hero_miniatura_2', label: 'Miniatura do hero — Bolo' },
  { chave: 'hero_miniatura_3', label: 'Miniatura do hero — Salgado' },
  { chave: 'sobre_historia', label: 'Seção "Nossa história"' },
  { chave: 'produto_paes', label: 'Card de produto — Pães' },
  { chave: 'produto_bolos', label: 'Card de produto — Bolos' },
  { chave: 'produto_salgados', label: 'Card de produto — Salgados' },
  { chave: 'produto_doces', label: 'Card de produto — Doces' },
  { chave: 'produto_lanches', label: 'Card de produto — Lanches' },
  { chave: 'produto_cafes', label: 'Card de produto — Cafés' },
  { chave: 'galeria_1', label: 'Galeria — Fachada' },
  { chave: 'galeria_2', label: 'Galeria — Produtos' },
  { chave: 'galeria_3', label: 'Galeria — Bolos' },
  { chave: 'galeria_4', label: 'Galeria — Pães, salgados e ambiente' },
  { chave: 'galeria_5', label: 'Galeria — Atendimento' },
  { chave: 'galeria_6', label: 'Galeria — Salgados' },
];

const SITES = {
  cristal: { bancoSite: 'cristal', chaves: CHAVES_CRISTAL },
  'pan-cristal': { bancoSite: 'pan_cristal', chaves: CHAVES_PAN_CRISTAL },
};

function obterConfigSite(siteParam) {
  return SITES[siteParam] || null;
}

module.exports = { SITES, obterConfigSite };
