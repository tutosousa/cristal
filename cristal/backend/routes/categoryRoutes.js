const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/auth');
const { uploadCategoria } = require('../middleware/upload');
const {
  listCategories,
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  removeCategoryImage,
} = require('../controllers/categoryController');

// Pública
router.get('/', listCategories);

// Admin
router.get('/admin/all', requireAdminAuth, listCategoriesAdmin);
router.post('/', requireAdminAuth, uploadCategoria.single('imagem'), createCategory);
router.put('/:id', requireAdminAuth, uploadCategoria.single('imagem'), updateCategory);
router.delete('/:id/imagem', requireAdminAuth, removeCategoryImage);
router.delete('/:id', requireAdminAuth, deleteCategory);

module.exports = router;
