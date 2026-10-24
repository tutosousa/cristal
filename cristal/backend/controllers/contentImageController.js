const { pool } = require('../config/db');
const { urlDoArquivo, removerArquivo } = require('../services/storage');
const { obterConfigSite } = require('../config/conteudoImagensChaves');

async function listarImagensSite(req, res, next) {
  try {
    const { site } = req.params;
    const config = obterConfigSite(site);
    if (!config) {
      return res.status(404).json({ error: 'Site inválido.' });
    }

    const [linhas] = await pool.query(
      'SELECT chave, imagem_url, atualizado_em FROM conteudo_imagens WHERE site = ?',
      [config.bancoSite]
    );
    const porChave = new Map(linhas.map((l) => [l.chave, l]));

    const resultado = config.chaves.map(({ chave, label }) => {
      const linha = porChave.get(chave);
      return {
        chave,
        label,
        imagem_url: linha ? linha.imagem_url : null,
        atualizado_em: linha ? linha.atualizado_em : null,
      };
    });

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function atualizarImagemSite(req, res, next) {
  try {
    const { site, chave } = req.params;
    const config = obterConfigSite(site);
    if (!config) {
      return res.status(404).json({ error: 'Site inválido.' });
    }

    const chaveValida = config.chaves.some((c) => c.chave === chave);
    if (!chaveValida) {
      return res.status(400).json({ error: 'Esta imagem não existe para este site.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada. Selecione um arquivo e tente novamente.' });
    }

    const novaImagemUrl = urlDoArquivo(req.file);

    const [existente] = await pool.query(
      'SELECT imagem_url FROM conteudo_imagens WHERE site = ? AND chave = ?',
      [config.bancoSite, chave]
    );

    await pool.query(
      `INSERT INTO conteudo_imagens (site, chave, imagem_url)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE imagem_url = VALUES(imagem_url)`,
      [config.bancoSite, chave, novaImagemUrl]
    );

    if (existente.length && existente[0].imagem_url) {
      removerArquivo(existente[0].imagem_url);
    }

    res.json({ message: 'Imagem atualizada com sucesso.', chave, imagem_url: novaImagemUrl });
  } catch (err) {
    next(err);
  }
}

async function removerImagemSite(req, res, next) {
  try {
    const { site, chave } = req.params;
    const config = obterConfigSite(site);
    if (!config) {
      return res.status(404).json({ error: 'Site inválido.' });
    }

    const chaveValida = config.chaves.some((c) => c.chave === chave);
    if (!chaveValida) {
      return res.status(400).json({ error: 'Esta imagem não existe para este site.' });
    }

    const [existente] = await pool.query(
      'SELECT imagem_url FROM conteudo_imagens WHERE site = ? AND chave = ?',
      [config.bancoSite, chave]
    );

    if (!existente.length || !existente[0].imagem_url) {
      return res.status(404).json({ error: 'Não há imagem cadastrada para remover.' });
    }

    await pool.query(
      'UPDATE conteudo_imagens SET imagem_url = NULL WHERE site = ? AND chave = ?',
      [config.bancoSite, chave]
    );

    removerArquivo(existente[0].imagem_url);

    res.json({ message: 'Imagem removida com sucesso.', chave, imagem_url: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarImagensSite, atualizarImagemSite, removerImagemSite };
