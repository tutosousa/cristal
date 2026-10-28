const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listPublicProducts,
  getPublicProduct,
  listAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProductImage,
  setImagemCor,
  deleteProduct,
  createColor,
  updateColor,
  deleteColor,
  createSize,
  updateSize,
  uploadSizeImage,
  deleteSizeImage,
  deleteSize,
  salvarVariacoesEstoque,
  definirFotoPrincipal,
} = require('../controllers/productController');

router.get('/', listPublicProducts);
router.get('/:id', getPublicProduct);

router.get('/admin/all', requireAdminAuth, listAdminProducts);
router.get('/admin/:id', requireAdminAuth, getAdminProduct);
router.post('/admin', requireAdminAuth, upload.array('imagens', 8), createProduct);
router.put('/admin/:id', requireAdminAuth, upload.array('imagens', 8), updateProduct);
router.delete('/admin/:id', requireAdminAuth, deleteProduct);

router.delete('/admin/:id/imagens/:imagemId', requireAdminAuth, deleteProductImage);
router.put('/admin/:id/imagens/:imagemId/cor', requireAdminAuth, setImagemCor);

router.post('/admin/:id/cores', requireAdminAuth, createColor);
router.put('/admin/:id/cores/:corId', requireAdminAuth, updateColor);
router.delete('/admin/:id/cores/:corId', requireAdminAuth, deleteColor);

router.post('/admin/:id/tamanhos', requireAdminAuth, createSize);
router.put('/admin/:id/tamanhos/:tamanhoId', requireAdminAuth, updateSize);
router.post('/admin/:id/tamanhos/:tamanhoId/imagem', requireAdminAuth, ...upload.single('imagem'), uploadSizeImage);
router.delete('/admin/:id/tamanhos/:tamanhoId/imagem', requireAdminAuth, deleteSizeImage);
router.delete('/admin/:id/tamanhos/:tamanhoId', requireAdminAuth, deleteSize);

router.put('/admin/:id/variacoes', requireAdminAuth, salvarVariacoesEstoque);

router.put('/admin/:id/foto-principal', requireAdminAuth, definirFotoPrincipal);

module.exports = router;
