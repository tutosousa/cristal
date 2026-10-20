// Armazenamento de imagens enviadas pelo admin.
//
// Dois modos, escolhidos automaticamente:
//  - Cloudinary (produção, ex: Vercel): ativado quando CLOUDINARY_URL (ou
//    CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)
//    estiver configurado. O disco da Vercel é temporário/somente leitura, por
//    isso as fotos precisam ficar num serviço externo. No banco, passa a ser
//    gravada a URL completa (https://res.cloudinary.com/...).
//  - Disco local (desenvolvimento): salva em backend/uploads/<pasta> e grava
//    no banco o caminho relativo (/uploads/<pasta>/<arquivo>), como sempre foi.
//
// O resto do sistema só usa: urlDoArquivo(file) e removerArquivo(url).

const fs = require('fs');
const path = require('path');

function cloudinaryAtivo() {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
}

let cloudinaryClient = null;
function obterCloudinary() {
  if (!cloudinaryClient) {
    const { v2 } = require('cloudinary');
    if (!process.env.CLOUDINARY_URL) {
      v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    } else {
      v2.config({ secure: true });
    }
    cloudinaryClient = v2;
  }
  return cloudinaryClient;
}

// Envia um arquivo em memória (multer.memoryStorage) para o Cloudinary.
function enviarBuffer(file, pasta) {
  const cloudinary = obterCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `cristal/${pasta}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

// Middleware pós-multer: envia req.file / req.files ao Cloudinary e
// preenche file.urlFinal. Em modo disco, apenas monta o caminho local.
function criarEnvioMiddleware(pasta) {
  return async function enviarArquivos(req, res, next) {
    try {
      const arquivos = req.files ? (Array.isArray(req.files) ? req.files : []) : req.file ? [req.file] : [];
      for (const f of arquivos) {
        if (cloudinaryAtivo()) {
          const resultado = await enviarBuffer(f, pasta);
          f.urlFinal = resultado.secure_url;
        } else {
          f.urlFinal = `/uploads/${pasta}/${f.filename}`;
        }
      }
      next();
    } catch (err) {
      console.error('Falha ao enviar imagem para o armazenamento:', err);
      res.status(500).json({ error: 'Não foi possível enviar a imagem. Tente novamente.' });
    }
  };
}

// URL que deve ser gravada no banco para um arquivo recém-enviado.
function urlDoArquivo(file) {
  return file.urlFinal;
}

// Apaga o arquivo físico referente a uma URL gravada no banco. Nunca lança
// erro (a remoção no banco é o que importa para o usuário).
function removerArquivo(url) {
  if (!url) return;
  try {
    if (/^https?:\/\//i.test(url)) {
      // Cloudinary: public_id = tudo depois de /upload/[v123/] sem extensão
      const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
      if (m && cloudinaryAtivo()) {
        obterCloudinary().uploader.destroy(m[1]).catch(() => {});
      }
    } else {
      const caminho = path.join(__dirname, '..', url.replace(/^\/uploads\//, 'uploads/'));
      fs.unlink(caminho, () => {});
    }
  } catch (e) {
    // ignora
  }
}

module.exports = { cloudinaryAtivo, criarEnvioMiddleware, urlDoArquivo, removerArquivo };
