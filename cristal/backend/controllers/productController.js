const { pool } = require('../config/db');
const { urlDoArquivo, removerArquivo } = require('../services/storage');

async function listPublicProducts(req, res, next) {
  try {
    const { categoria } = req.query;

    let sql = `
      SELECT p.id, p.nome, p.descricao, CASE WHEN p.possui_flores = 1 THEN (SELECT MIN(pt.preco) FROM produto_tamanhos pt WHERE pt.produto_id = p.id AND pt.ativo = 1 AND pt.preco > 0) ELSE p.preco_varejo END AS preco_varejo,
             p.imagem_url, p.estoque, p.possui_flores, c.nome AS categoria, c.slug AS categoria_slug
      FROM produtos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.ativo = 1
    `;
    const params = [];

    if (categoria) {
      sql += ' AND c.slug = ?';
      params.push(categoria);
    }

    sql += ' ORDER BY p.criado_em DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getPublicProduct(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.id, p.nome, p.descricao, CASE WHEN p.possui_flores = 1 THEN (SELECT MIN(pt.preco) FROM produto_tamanhos pt WHERE pt.produto_id = p.id AND pt.ativo = 1 AND pt.preco > 0) ELSE p.preco_varejo END AS preco_varejo,
              p.imagem_url, p.estoque, p.possui_flores, c.nome AS categoria, c.slug AS categoria_slug
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = ? AND p.ativo = 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const [imagens] = await pool.query(
      'SELECT id, imagem_url, cor_id FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [cores] = await pool.query(
      'SELECT id, nome, codigo_hex FROM produto_cores WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [tamanhos] = await pool.query(
      'SELECT id, tamanho, descricao, preco, imagem_url, ativo FROM produto_tamanhos WHERE produto_id = ? AND ativo = 1 ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [variacoes] = await pool.query(
      'SELECT cor_id, tamanho_id, estoque FROM produto_variacoes WHERE produto_id = ?',
      [id]
    );

    const galeriaGeral = [];
    if (rows[0].imagem_url) galeriaGeral.push(rows[0].imagem_url);
    imagens
      .filter((img) => !img.cor_id)
      .forEach((img) => {
        if (img.imagem_url !== rows[0].imagem_url) galeriaGeral.push(img.imagem_url);
      });

    const coresComFotos = cores.map((cor) => ({
      ...cor,
      galeria: imagens.filter((img) => img.cor_id === cor.id).map((img) => img.imagem_url),
    }));

    res.json({
      ...rows[0],
      galeria: galeriaGeral,
      cores: coresComFotos,
      tamanhos,
      variacoes,
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminProducts(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, CASE WHEN p.possui_flores = 1 THEN COALESCE((SELECT MIN(pt.preco) FROM produto_tamanhos pt WHERE pt.produto_id = p.id AND pt.ativo = 1 AND pt.preco > 0), 0) ELSE p.preco_varejo END AS preco_exibicao, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       ORDER BY p.criado_em DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getAdminProduct(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    const [imagens] = await pool.query(
      'SELECT id, imagem_url, cor_id FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [cores] = await pool.query(
      'SELECT id, nome, codigo_hex FROM produto_cores WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [tamanhos] = await pool.query(
      'SELECT id, tamanho, descricao, preco, imagem_url, ativo FROM produto_tamanhos WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
      [id]
    );
    const [variacoes] = await pool.query(
      'SELECT id, cor_id, tamanho_id, estoque FROM produto_variacoes WHERE produto_id = ?',
      [id]
    );
    res.json({ ...rows[0], imagens, cores, tamanhos, variacoes });
  } catch (err) {
    next(err);
  }
}

async function salvarVariacoesEstoque(req, res, next) {
  try {
    const { id } = req.params;
    const { variacoes } = req.body;

    if (!Array.isArray(variacoes)) {
      return res.status(400).json({ error: 'Lista de variações inválida.' });
    }

    for (const v of variacoes) {
      const estoque = Math.max(0, parseInt(v.estoque, 10) || 0);
      await pool.query(
        `INSERT INTO produto_variacoes (produto_id, cor_id, tamanho_id, estoque)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estoque = VALUES(estoque)`,
        [id, v.cor_id || null, v.tamanho_id || null, estoque]
      );
    }

    res.json({ message: 'Estoque salvo com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const {
      nome,
      descricao,
      categoria_id,
      preco_varejo,
      estoque,
      possui_flores,
      tipo_tamanho,
      tamanhos_selecionados,
    } = req.body;

    const possuiFloresBool = ['true', 'on', '1', 1, true].includes(possui_flores);
    if (!nome || !categoria_id || (!possuiFloresBool && (preco_varejo === undefined || preco_varejo === '' || Number(preco_varejo) <= 0))) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios; produtos sem flores também precisam de preço maior que zero.' });
    }
    if (!possuiFloresBool && (estoque === undefined || estoque === '' || Number(estoque) < 0 || !Number.isFinite(Number(estoque)))) {
      return res.status(400).json({ error: 'Informe um estoque válido para produtos sem flores.' });
    }

    const arquivos = req.files || [];
    const urls = arquivos.map((f) => urlDoArquivo(f));
    const imagem_url = urls[0] || null;

    const [result] = await pool.query(
      `INSERT INTO produtos
        (nome, descricao, categoria_id, preco_custo, preco_varejo, preco_atacado,
         desconto_atacado_percentual, quantidade_minima_atacado, estoque, imagem_url,
         peso_kg, altura_cm, largura_cm, comprimento_cm, possui_flores, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nome,
        descricao || null,
        categoria_id,
        0,
        possuiFloresBool ? 0 : preco_varejo,
        null,
        0,
        1,
        possuiFloresBool ? 0 : (estoque || 0),
        imagem_url,
        0.3,
        15,
        20,
        20,
        possuiFloresBool ? 1 : 0,
      ]
    );

    const produtoId = result.insertId;

    if (urls.length > 0) {
      const valores = urls.map((url, index) => [produtoId, url, index]);
      await pool.query(
        'INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES ?',
        [valores]
      );
    }

    if (possuiFloresBool) {
      if (tipo_tamanho === 'unico') {
        await pool.query(
          "INSERT INTO produto_tamanhos (produto_id, tamanho, ordem) VALUES (?, 'ÚNICO', 0)",
          [produtoId]
        );
      } else {
        await pool.query(
          `INSERT INTO produto_tamanhos (produto_id, tamanho, ordem) VALUES (?, 'PP', 0), (?, 'P', 1), (?, 'M', 2), (?, 'G', 3)`,
          [produtoId, produtoId, produtoId, produtoId]
        );
      }
    }

    res.status(201).json({ id: produtoId, message: 'Produto criado com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      categoria_id,
      preco_varejo,
      estoque,
      ativo,
      possui_flores,
      tipo_tamanho,
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const possuiFloresFinal =
      possui_flores === undefined
        ? existing[0].possui_flores
        : ['true', 'on', '1', 1, true].includes(possui_flores)
          ? 1
          : 0;

    if (!possuiFloresFinal && estoque !== undefined && estoque !== '' && (!Number.isFinite(Number(estoque)) || Number(estoque) < 0)) {
      return res.status(400).json({ error: 'Informe um estoque válido para produtos sem flores.' });
    }
    if (!possuiFloresFinal && preco_varejo !== undefined && preco_varejo !== '' && (!Number.isFinite(Number(preco_varejo)) || Number(preco_varejo) <= 0)) {
      return res.status(400).json({ error: 'O preço do produto deve ser maior que zero.' });
    }

    const arquivos = req.files || [];
    const novasUrls = arquivos.map((f) => urlDoArquivo(f));

    if (novasUrls.length > 0) {
      const corIdDestino = req.body.cor_id ? Number(req.body.cor_id) : null;
      const [{ maxOrdem }] = (
        await pool.query(
          'SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM produto_imagens WHERE produto_id = ?',
          [id]
        )
      )[0];
      const valores = novasUrls.map((url, index) => [id, url, maxOrdem + 1 + index, corIdDestino]);
      await pool.query(
        'INSERT INTO produto_imagens (produto_id, imagem_url, ordem, cor_id) VALUES ?',
        [valores]
      );
    }

    const imagem_url = existing[0].imagem_url || novasUrls[0] || null;

    await pool.query(
      `UPDATE produtos SET
        nome = ?, descricao = ?, categoria_id = ?, preco_custo = ?, preco_varejo = ?,
        preco_atacado = NULL, desconto_atacado_percentual = 0, quantidade_minima_atacado = 1,
        estoque = ?, imagem_url = ?, ativo = ?,
        possui_flores = ?
       WHERE id = ?`,
      [
        nome ?? existing[0].nome,
        descricao ?? existing[0].descricao,
        categoria_id ?? existing[0].categoria_id,
        0,
        preco_varejo ?? existing[0].preco_varejo,
        possuiFloresFinal ? 0 : (estoque ?? existing[0].estoque),
        imagem_url,
        ativo ?? existing[0].ativo,
        possuiFloresFinal,
        id,
      ]
    );

    if (possuiFloresFinal && tipo_tamanho === 'selecionados') {
      const permitidos = ['PP', 'P', 'M', 'G', 'ÚNICO'];
      const selecionados = Array.isArray(tamanhos_selecionados)
        ? [...new Set(tamanhos_selecionados.map((t) => String(t).trim().toUpperCase()).filter((t) => permitidos.includes(t)))]
        : [];
      if (!selecionados.length) return res.status(400).json({ error: 'Selecione pelo menos um tamanho.' });
      if (selecionados.includes('ÚNICO') && selecionados.length > 1) {
        return res.status(400).json({ error: 'Tamanho único não pode ser combinado com outros tamanhos.' });
      }
      await pool.query('UPDATE produto_tamanhos SET ativo = 0 WHERE produto_id = ?', [id]);
      const ordemPadrao = { PP: 0, P: 1, M: 2, G: 3, 'ÚNICO': 0 };
      for (const tamanho of selecionados) {
        const [existentes] = await pool.query('SELECT id FROM produto_tamanhos WHERE produto_id = ? AND UPPER(tamanho) = ?', [id, tamanho]);
        if (existentes.length) {
          await pool.query('UPDATE produto_tamanhos SET ativo = 1, ordem = ? WHERE produto_id = ? AND UPPER(tamanho) = ?', [ordemPadrao[tamanho], id, tamanho]);
        } else {
          await pool.query('INSERT INTO produto_tamanhos (produto_id, tamanho, ordem, ativo) VALUES (?, ?, ?, 1)', [id, tamanho, ordemPadrao[tamanho]]);
        }
      }
    } else if (possuiFloresFinal && tipo_tamanho === 'unico') {
      await pool.query('UPDATE produto_tamanhos SET ativo = 0 WHERE produto_id = ?', [id]);
      const [unicos] = await pool.query("SELECT id FROM produto_tamanhos WHERE produto_id = ? AND UPPER(tamanho) = 'ÚNICO'", [id]);
      if (unicos.length) await pool.query("UPDATE produto_tamanhos SET ativo = 1, ordem = 0 WHERE produto_id = ? AND UPPER(tamanho) = 'ÚNICO'", [id]);
      else await pool.query("INSERT INTO produto_tamanhos (produto_id, tamanho, ordem) VALUES (?, 'ÚNICO', 0)", [id]);
    } else if (possuiFloresFinal && tipo_tamanho === 'variados') {
      await pool.query('UPDATE produto_tamanhos SET ativo = 0 WHERE produto_id = ?', [id]);
      const [tamanhosAtuais] = await pool.query('SELECT tamanho FROM produto_tamanhos WHERE produto_id = ?', [id]);
      const existentes = new Set(tamanhosAtuais.map((t) => String(t.tamanho).toUpperCase()));
      for (const [tamanho, ordem] of [['PP', 0], ['P', 1], ['M', 2], ['G', 3]]) {
        if (!existentes.has(tamanho)) await pool.query('INSERT INTO produto_tamanhos (produto_id, tamanho, ordem, ativo) VALUES (?, ?, ?, 1)', [id, tamanho, ordem]);
        else await pool.query('UPDATE produto_tamanhos SET ativo = 1, ordem = ? WHERE produto_id = ? AND UPPER(tamanho) = ?', [ordem, id, tamanho]);
      }
    }

    res.json({ message: 'Produto atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function deleteProductImage(req, res, next) {
  try {
    const { id, imagemId } = req.params;

    const [rows] = await pool.query(
      'SELECT imagem_url FROM produto_imagens WHERE id = ? AND produto_id = ?',
      [imagemId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada.' });
    }

    await pool.query('DELETE FROM produto_imagens WHERE id = ?', [imagemId]);

    const [produtoRows] = await pool.query('SELECT imagem_url FROM produtos WHERE id = ?', [id]);
    if (produtoRows[0] && produtoRows[0].imagem_url === rows[0].imagem_url) {
      const [restantes] = await pool.query(
        'SELECT imagem_url FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC LIMIT 1',
        [id]
      );
      const novaCapa = restantes[0] ? restantes[0].imagem_url : null;
      await pool.query('UPDATE produtos SET imagem_url = ? WHERE id = ?', [novaCapa, id]);
    }

    res.json({ message: 'Foto removida com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function setImagemCor(req, res, next) {
  try {
    const { id, imagemId } = req.params;
    const { cor_id } = req.body;

    const [rows] = await pool.query(
      'SELECT id FROM produto_imagens WHERE id = ? AND produto_id = ?',
      [imagemId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada.' });
    }

    await pool.query('UPDATE produto_imagens SET cor_id = ? WHERE id = ?', [
      cor_id || null,
      imagemId,
    ]);

    res.json({ message: 'Foto atualizada.' });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM produtos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    await pool.query('DELETE FROM produtos WHERE id = ?', [id]);

    res.json({ message: 'Produto excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function createColor(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, codigo_hex } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da cor é obrigatório.' });
    }

    const [[{ maxOrdem }]] = await pool.query(
      'SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM produto_cores WHERE produto_id = ?',
      [id]
    );

    const [result] = await pool.query(
      'INSERT INTO produto_cores (produto_id, nome, codigo_hex, ordem) VALUES (?, ?, ?, ?)',
      [id, nome.trim(), codigo_hex || null, maxOrdem + 1]
    );

    res.status(201).json({ id: result.insertId, nome: nome.trim(), codigo_hex: codigo_hex || null });
  } catch (err) {
    next(err);
  }
}

async function updateColor(req, res, next) {
  try {
    const { corId } = req.params;
    const { nome, codigo_hex } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da cor é obrigatório.' });
    }
    await pool.query('UPDATE produto_cores SET nome = ?, codigo_hex = ? WHERE id = ?', [
      nome.trim(),
      codigo_hex || null,
      corId,
    ]);
    res.json({ message: 'Cor atualizada.' });
  } catch (err) {
    next(err);
  }
}

async function deleteColor(req, res, next) {
  try {
    const { corId } = req.params;
    await pool.query('DELETE FROM produto_cores WHERE id = ?', [corId]);
    res.json({ message: 'Cor removida.' });
  } catch (err) {
    next(err);
  }
}

async function createSize(req, res, next) {
  try {
    const { id } = req.params;
    const { tamanho } = req.body;
    if (!tamanho || !tamanho.trim()) {
      return res.status(400).json({ error: 'O tamanho é obrigatório.' });
    }

    const [[{ maxOrdem }]] = await pool.query(
      'SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM produto_tamanhos WHERE produto_id = ?',
      [id]
    );

    const [result] = await pool.query(
      'INSERT INTO produto_tamanhos (produto_id, tamanho, ordem) VALUES (?, ?, ?)',
      [id, tamanho.trim().toUpperCase(), maxOrdem + 1]
    );

    res.status(201).json({ id: result.insertId, tamanho: tamanho.trim().toUpperCase() });
  } catch (err) {
    next(err);
  }
}

async function updateSize(req, res, next) {
  try {
    const { id, tamanhoId } = req.params;
    const { tamanho, descricao, preco, ativo } = req.body;
    const [rows] = await pool.query(
      'SELECT id FROM produto_tamanhos WHERE id = ? AND produto_id = ?',
      [tamanhoId, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tamanho não encontrado.' });
    if (preco !== undefined && preco !== '' && (!Number.isFinite(Number(preco)) || Number(preco) <= 0)) {
      return res.status(400).json({ error: 'Informe um preço válido maior que zero.' });
    }
    await pool.query(
      `UPDATE produto_tamanhos SET tamanho = ?, descricao = ?, preco = ?, ativo = ?
       WHERE id = ? AND produto_id = ?`,
      [
        String(tamanho || '').trim().toUpperCase() || 'P',
        descricao || null,
        preco === undefined || preco === '' ? null : Number(preco),
        ativo === undefined ? 1 : (['1', 1, true, 'true'].includes(ativo) ? 1 : 0),
        tamanhoId,
        id,
      ]
    );
    res.json({ message: 'Variação atualizada com sucesso.' });
  } catch (err) { next(err); }
}

async function uploadSizeImage(req, res, next) {
  try {
    const { id, tamanhoId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem.' });
    const [rows] = await pool.query(
      'SELECT imagem_url FROM produto_tamanhos WHERE id = ? AND produto_id = ?',
      [tamanhoId, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Variação não encontrada.' });
    const imageUrl = urlDoArquivo(req.file);
    await pool.query('UPDATE produto_tamanhos SET imagem_url = ? WHERE id = ? AND produto_id = ?', [imageUrl, tamanhoId, id]);
    if (rows[0].imagem_url && rows[0].imagem_url !== imageUrl) removerArquivo(rows[0].imagem_url);
    res.json({ message: 'Foto da variação atualizada.', imagem_url: imageUrl });
  } catch (err) { next(err); }
}

async function deleteSizeImage(req, res, next) {
  try {
    const { id, tamanhoId } = req.params;
    const [rows] = await pool.query(
      'SELECT imagem_url FROM produto_tamanhos WHERE id = ? AND produto_id = ?',
      [tamanhoId, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Variação não encontrada.' });
    await pool.query('UPDATE produto_tamanhos SET imagem_url = NULL WHERE id = ? AND produto_id = ?', [tamanhoId, id]);
    if (rows[0].imagem_url) {
      const [refs] = await pool.query('SELECT id FROM produtos WHERE imagem_url = ? UNION SELECT id FROM produto_imagens WHERE imagem_url = ? LIMIT 1', [rows[0].imagem_url, rows[0].imagem_url]);
      if (!refs.length) removerArquivo(rows[0].imagem_url);
    }
    res.json({ message: 'Foto da variação removida.' });
  } catch (err) { next(err); }
}

async function deleteSize(req, res, next) {
  try {
    const { tamanhoId } = req.params;
    await pool.query('DELETE FROM produto_tamanhos WHERE id = ?', [tamanhoId]);
    res.json({ message: 'Tamanho removido.' });
  } catch (err) {
    next(err);
  }
}

async function definirFotoPrincipal(req, res, next) {
  try {
    const { id } = req.params;
    const { imagem_id } = req.body;

    const [imagens] = await pool.query(
      'SELECT imagem_url FROM produto_imagens WHERE id = ? AND produto_id = ? AND cor_id IS NULL',
      [imagem_id, id]
    );
    if (imagens.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada entre as fotos gerais deste produto.' });
    }

    await pool.query('UPDATE produtos SET imagem_url = ? WHERE id = ?', [imagens[0].imagem_url, id]);
    res.json({ message: 'Foto principal atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
