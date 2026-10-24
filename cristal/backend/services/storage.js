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

function urlDoArquivo(file) {
  return file.urlFinal;
}

function removerArquivo(url) {
  if (!url) return;
  try {
    if (/^https?:\/\//i.test(url)) {
      const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
      if (m && cloudinaryAtivo()) {
        obterCloudinary().uploader.destroy(m[1]).catch(() => {});
      }
    } else {
      const caminho = path.join(__dirname, '..', url.replace(/^\/uploads\//, 'uploads/'));
      fs.unlink(caminho, () => {});
    }
  } catch (e) {
  }
}

module.exports = { cloudinaryAtivo, criarEnvioMiddleware, urlDoArquivo, removerArquivo };
