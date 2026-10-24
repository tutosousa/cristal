const { pool } = require('../config/db');
const { urlDoArquivo } = require('../services/storage');

async function listPublicProducts(req, res, next) {
  try {
    const { categoria } = req.query;

    let sql = `
      SELECT p.id, p.nome, p.descricao, p.preco_varejo, p.preco_atacado,
             p.desconto_atacado_percentual, p.quantidade_minima_atacado,
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
      `SELECT p.id, p.nome, p.descricao, p.preco_varejo, p.preco_atacado,
              p.desconto_atacado_percentual, p.quantidade_minima_atacado,
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
      'SELECT id, tamanho FROM produto_tamanhos WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
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
      `SELECT p.*, c.nome AS categoria
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
      'SELECT id, tamanho FROM produto_tamanhos WHERE produto_id = ? ORDER BY ordem ASC, id ASC',
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
      preco_custo,
      preco_varejo,
      preco_atacado,
      desconto_atacado_percentual,
      quantidade_minima_atacado,
      estoque,
      peso_kg,
      altura_cm,
      largura_cm,
      comprimento_cm,
      possui_flores,
    } = req.body;

    if (!nome || !categoria_id || preco_varejo === undefined) {
      return res.status(400).json({
        error: 'Nome, categoria e preço de varejo são obrigatórios.',
      });
    }

    const possuiFloresBool = ['true', 'on', '1', 1, true].includes(possui_flores);

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
        preco_custo || 0,
        preco_varejo,
        preco_atacado || null,
        desconto_atacado_percentual || 0,
        quantidade_minima_atacado || 50,
        estoque || 0,
        imagem_url,
        peso_kg || 0.3,
        altura_cm || 15,
        largura_cm || 20,
        comprimento_cm || 20,
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
      preco_custo,
      preco_varejo,
      preco_atacado,
      desconto_atacado_percentual,
      quantidade_minima_atacado,
      estoque,
      ativo,
      peso_kg,
      altura_cm,
      largura_cm,
      comprimento_cm,
      possui_flores,
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
        preco_atacado = ?, desconto_atacado_percentual = ?, quantidade_minima_atacado = ?,
        estoque = ?, imagem_url = ?, ativo = ?,
        peso_kg = ?, altura_cm = ?, largura_cm = ?, comprimento_cm = ?, possui_flores = ?
       WHERE id = ?`,
      [
        nome ?? existing[0].nome,
        descricao ?? existing[0].descricao,
        categoria_id ?? existing[0].categoria_id,
        preco_custo ?? existing[0].preco_custo,
        preco_varejo ?? existing[0].preco_varejo,
        preco_atacado ?? existing[0].preco_atacado,
        desconto_atacado_percentual ?? existing[0].desconto_atacado_percentual,
        quantidade_minima_atacado ?? existing[0].quantidade_minima_atacado,
        estoque ?? existing[0].estoque,
        imagem_url,
        ativo ?? existing[0].ativo,
        peso_kg ?? existing[0].peso_kg,
        altura_cm ?? existing[0].altura_cm,
        largura_cm ?? existing[0].largura_cm,
        comprimento_cm ?? existing[0].comprimento_cm,
        possuiFloresFinal,
        id,
      ]
    );

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
  deleteSize,
  salvarVariacoesEstoque,
  definirFotoPrincipal,
};
