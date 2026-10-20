// Configuração do multer para upload de fotos de produtos.
// Salva os arquivos em backend/uploads/products com um nome único,
// e valida que somente imagens sejam aceitas (segurança básica de upload).

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `produto-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5MB por arquivo, até 8 fotos
});

// Upload da imagem de categoria — mesma validação, mas salva em uma pasta
// separada (uploads/categories) e aceita só um arquivo por vez.
const storageCategoria = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'categories'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `categoria-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const uploadCategoria = multer({
  storage: storageCategoria,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// Upload de imagens de conteúdo (banners/destaques da landing page e da
// Pan Cristal, gerenciados pelo admin) — mesma validação, pasta própria
// (uploads/conteudo) e um arquivo por vez.
const storageConteudo = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'conteudo'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `conteudo-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const uploadConteudo = multer({
  storage: storageConteudo,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = upload;
module.exports.uploadCategoria = uploadCategoria;
module.exports.uploadConteudo = uploadConteudo;
