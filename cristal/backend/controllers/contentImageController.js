const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { obterConfigSite } = require('../config/conteudoImagensChaves');

// Lista as imagens de conteúdo de um site (cristal | pan-cristal), sempre
// devolvendo TODAS as chaves conhecidas daquele site — mesmo as que ainda
// não têm nenhuma imagem cadastrada (imagem_url vem null nesse caso, e
// quem está consumindo — site público ou admin — decide o que fazer: o
// site público cai no visual padrão já existente, o admin mostra "Nenhuma
// imagem enviada ainda").
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

// Atualiza (cria ou substitui) a imagem de uma chave específica de um
// site. Só admin autenticado chega aqui (ver rota). Se já existia uma
// imagem anterior para essa mesma chave, apaga o arquivo antigo do disco
// depois de confirmar que a troca no banco deu certo — uma chave é usada
// em exatamente um lugar do site, então não tem risco de apagar uma
// imagem que ainda está em uso em outro lugar.
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

    const novaImagemUrl = `/uploads/conteudo/${req.file.filename}`;

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

    // Remove o arquivo antigo (se havia um) só depois do banco confirmar
    // a troca — nunca antes, pra não correr risco de ficar sem nenhuma
    // imagem caso o UPDATE falhasse.
    if (existente.length && existente[0].imagem_url) {
      const caminhoAntigo = path.join(__dirname, '..', existente[0].imagem_url.replace(/^\/uploads\//, 'uploads/'));
      fs.unlink(caminhoAntigo, () => {
        // Se o arquivo não existir mais ou não puder ser apagado, só
        // ignora — isso nunca deve impedir a resposta de sucesso pro
        // admin, a troca da imagem já está concluída e salva.
      });
    }

    res.json({ message: 'Imagem atualizada com sucesso.', chave, imagem_url: novaImagemUrl });
  } catch (err) {
    next(err);
  }
}

// Remove a imagem cadastrada de uma chave (volta pro fallback padrão do
// site, já tratado no frontend público). Só admin autenticado chega aqui
// (ver rota). Não apaga a linha da chave, só limpa imagem_url — assim a
// chave continua existindo e pronta pra receber uma nova imagem depois.
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

    // Só apaga o arquivo do disco depois de confirmar que o banco já não
    // referencia mais ele — cada chave é usada em um único lugar do site,
    // então não existe risco de apagar um arquivo ainda em uso em outro ponto.
    const caminhoAntigo = path.join(__dirname, '..', existente[0].imagem_url.replace(/^\/uploads\//, 'uploads/'));
    fs.unlink(caminhoAntigo, () => {
      // Se o arquivo já não existir ou não puder ser apagado, ignora — a
      // remoção no banco já está concluída e é isso que importa pra resposta.
    });

    res.json({ message: 'Imagem removida com sucesso.', chave, imagem_url: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarImagensSite, atualizarImagemSite, removerImagemSite };
