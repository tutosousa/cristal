const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { cloudinaryAtivo, criarEnvioMiddleware } = require('../services/storage');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.'));
  }
}

function criarUploader({ pasta, prefixo, maxArquivos }) {
  // Na Vercel, o filesystem da aplicação é somente leitura.
  // Sempre manter os arquivos em memória para enviá-los ao Cloudinary.
  const usarMemoria = cloudinaryAtivo() || process.env.VERCEL === '1';
  const storage = usarMemoria
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(__dirname, '..', 'uploads', pasta);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = crypto.randomBytes(8).toString('hex');
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${prefixo}-${Date.now()}-${uniqueSuffix}${ext}`);
        },
      });

  const instancia = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: maxArquivos },
  });
  const enviar = criarEnvioMiddleware(pasta);

  return {
    single: (campo) => [instancia.single(campo), enviar],
    array: (campo, max) => [instancia.array(campo, max), enviar],
  };
}

const upload = criarUploader({ pasta: 'products', prefixo: 'produto', maxArquivos: 8 });

const uploadCategoria = criarUploader({ pasta: 'categories', prefixo: 'categoria', maxArquivos: 1 });

const uploadConteudo = criarUploader({ pasta: 'conteudo', prefixo: 'conteudo', maxArquivos: 1 });

module.exports = upload;
module.exports.uploadCategoria = uploadCategoria;
module.exports.uploadConteudo = uploadConteudo;
