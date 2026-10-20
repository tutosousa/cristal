const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/auth');
const { uploadConteudo } = require('../middleware/upload');
const { listarImagensSite, atualizarImagemSite, removerImagemSite } = require('../controllers/contentImageController');

// Pública — o site (Cristal ou Pan Cristal) usa isso pra saber qual
// imagem mostrar em cada banner/destaque. Sem autenticação porque é
// conteúdo que já aparece publicamente na página de qualquer forma.
router.get('/:site', listarImagensSite);

// Admin — troca a imagem de uma chave específica. Protegida também no
// backend (nunca só no frontend): sem token de admin válido, nem chega a
// tentar salvar o arquivo.
router.put('/:site/:chave', requireAdminAuth, uploadConteudo.single('imagem'), atualizarImagemSite);

// Admin — remove a imagem cadastrada de uma chave (volta pro padrão do
// site). Também protegida no backend.
router.delete('/:site/:chave', requireAdminAuth, removerImagemSite);

module.exports = router;
