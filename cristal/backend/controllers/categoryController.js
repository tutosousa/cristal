const { pool } = require('../config/db');
const { urlDoArquivo, removerArquivo } = require('../services/storage');

function gerarSlug(nome) {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Lista as categorias ativas (público - usado no menu e na home da loja),
// na ordem definida pela administradora (ordem_exibicao) e depois por nome.
async function listCategories(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, nome, slug, imagem_url, icone
       FROM categorias
       WHERE ativo = 1
       ORDER BY ordem_exibicao ASC, nome ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Lista categorias para o admin (inclusive inativas), já com a contagem de
// produtos de cada uma (útil pra saber se dá pra excluir sem quebrar nada)
async function listCategoriesAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.nome, c.slug, c.imagem_url, c.icone, c.ativo, c.ordem_exibicao,
             COUNT(p.id) AS total_produtos
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id AND p.ativo = 1
      GROUP BY c.id
      ORDER BY c.ordem_exibicao ASC, c.nome ASC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Cria uma nova categoria (admin) — nome é obrigatório; imagem, ícone,
// status e ordem de exibição são opcionais.
async function createCategory(req, res, next) {
  try {
    const { nome, icone, ativo, ordem_exibicao } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }

    const slug = gerarSlug(nome);
    const imagem_url = req.file ? urlDoArquivo(req.file) : null;
    const ativoBool = ['false', '0', 0, false].includes(ativo) ? 0 : 1;

    const [result] = await pool.query(
      `INSERT INTO categorias (nome, slug, imagem_url, icone, ativo, ordem_exibicao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome.trim(), slug, imagem_url, icone || null, ativoBool, Number(ordem_exibicao) || 0]
    );

    res.status(201).json({ id: result.insertId, nome: nome.trim(), slug, imagem_url });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    }
    next(err);
  }
}

// Edita uma categoria existente (admin). Só troca a imagem se uma nova
// foto for enviada — sem isso, mantém a imagem que já estava salva.
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, icone, ativo, ordem_exibicao } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }

    const slug = gerarSlug(nome);
    const ativoBool = ['false', '0', 0, false].includes(ativo) ? 0 : 1;

    if (req.file) {
      const imagem_url = urlDoArquivo(req.file);
      await pool.query(
        `UPDATE categorias
         SET nome = ?, slug = ?, imagem_url = ?, icone = ?, ativo = ?, ordem_exibicao = ?
         WHERE id = ?`,
        [nome.trim(), slug, imagem_url, icone || null, ativoBool, Number(ordem_exibicao) || 0, id]
      );
    } else {
      await pool.query(
        `UPDATE categorias
         SET nome = ?, slug = ?, icone = ?, ativo = ?, ordem_exibicao = ?
         WHERE id = ?`,
        [nome.trim(), slug, icone || null, ativoBool, Number(ordem_exibicao) || 0, id]
      );
    }

    res.json({ message: 'Categoria atualizada com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    }
    next(err);
  }
}

// Exclui uma categoria (admin)
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ message: 'Categoria removida com sucesso.' });
  } catch (err) {
    // A categoria tem produtos vinculados (o banco impede a exclusão pra
    // não deixar produtos "órfãos", sem categoria nenhuma).
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        error: 'Não é possível excluir esta categoria porque ainda existem produtos nela. Mova ou exclua os produtos primeiro.',
      });
    }
    next(err);
  }
}

// Remove só a imagem de uma categoria (admin), mantendo nome, slug,
// status, ordem e produtos vinculados intactos — a categoria continua
// existindo normalmente, só fica sem foto (o site público cai no visual
// padrão já existente para categoria sem imagem).
async function removeCategoryImage(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT imagem_url FROM categorias WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    if (!rows[0].imagem_url) {
      return res.status(404).json({ error: 'Esta categoria não possui imagem cadastrada.' });
    }

    await pool.query('UPDATE categorias SET imagem_url = NULL WHERE id = ?', [id]);

    removerArquivo(rows[0].imagem_url);

    res.json({ message: 'Imagem removida com sucesso.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  removeCategoryImage,
};
