// Configuração do multer para upload de imagens (produtos, categorias e
// imagens de conteúdo do site). Valida que somente imagens sejam aceitas.
//
// Onde o arquivo fica depende do ambiente (ver services/storage.js):
//  - com Cloudinary configurado (produção/Vercel): fica em memória e é
//    enviado ao Cloudinary logo depois;
//  - sem Cloudinary (desenvolvimento local): salvo em backend/uploads/<pasta>.

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

// Cria um "uploader" para uma pasta/prefixo. Expõe .single() e .array() como
// antes, mas cada um devolve [multer, envio-ao-armazenamento] — o Express
// aceita arrays de middlewares, então as rotas não precisam mudar.
function criarUploader({ pasta, prefixo, maxArquivos }) {
  const storage = cloudinaryAtivo()
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
    limits: { fileSize: 5 * 1024 * 1024, files: maxArquivos }, // 5MB por arquivo
  });
  const enviar = criarEnvioMiddleware(pasta);

  return {
    single: (campo) => [instancia.single(campo), enviar],
    array: (campo, max) => [instancia.array(campo, max), enviar],
  };
}

// Fotos de produtos (até 8 por envio)
const upload = criarUploader({ pasta: 'products', prefixo: 'produto', maxArquivos: 8 });

// Imagem de categoria (1 arquivo)
const uploadCategoria = criarUploader({ pasta: 'categories', prefixo: 'categoria', maxArquivos: 1 });

// Imagens de conteúdo (banners/destaques da landing page e da Pan Cristal)
const uploadConteudo = criarUploader({ pasta: 'conteudo', prefixo: 'conteudo', maxArquivos: 1 });

module.exports = upload;
module.exports.uploadCategoria = uploadCategoria;
module.exports.uploadConteudo = uploadConteudo;
