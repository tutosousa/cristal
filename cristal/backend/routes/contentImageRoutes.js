const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/auth');
const { uploadConteudo } = require('../middleware/upload');
const { listarImagensSite, atualizarImagemSite, removerImagemSite } = require('../controllers/contentImageController');

router.get('/:site', listarImagensSite);

router.put('/:site/:chave', requireAdminAuth, uploadConteudo.single('imagem'), atualizarImagemSite);

router.delete('/:site/:chave', requireAdminAuth, removerImagemSite);

module.exports = router;
