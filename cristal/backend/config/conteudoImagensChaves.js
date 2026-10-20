// Lista única (fonte da verdade) de quais imagens de conteúdo cada site
// aceita, e o rótulo que o admin vê pra cada uma. O controller usa isso
// pra validar a "chave" recebida (nunca aceita uma chave qualquer), e a
// rota pública de listagem usa isso pra sempre devolver todas as chaves
// conhecidas — mesmo as que o admin ainda não configurou nenhuma imagem
// (nesse caso "imagem_url" vem null e o frontend usa o visual padrão).
//
// IMPORTANTE: isto é só para imagens de COMPOSIÇÃO/CONTEÚDO (banners,
// destaques, fotos ilustrativas de seção). Fotos de produto e de
// categoria já têm seus próprios campos/tabelas e não entram aqui.

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

// "site" na URL da API usa hífen (consistente com o resto do projeto,
// ex: pan-cristal.html), mas o banco usa underscore (ENUM não aceita
// hífen sem aspas o tempo todo e underscore é mais seguro em SQL).
const SITES = {
  cristal: { bancoSite: 'cristal', chaves: CHAVES_CRISTAL },
  'pan-cristal': { bancoSite: 'pan_cristal', chaves: CHAVES_PAN_CRISTAL },
};

function obterConfigSite(siteParam) {
  return SITES[siteParam] || null;
}

module.exports = { SITES, obterConfigSite };
