const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { enviarEmailCodigo, EMAIL_ATIVO } = require('../config/email');

const MINUTOS_EXPIRACAO_CODIGO = 10;

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const TABELAS = {
  admin: { nome: 'admins', temSenhaHash: 'senha_hash' },
  cliente: { nome: 'clientes', temSenhaHash: 'senha_hash' },
};

async function solicitarRecuperacao(tipo, email) {
  const tabela = TABELAS[tipo];
  const [rows] = await pool.query(`SELECT id, email FROM ${tabela.nome} WHERE email = ?`, [
    email,
  ]);

  if (rows.length > 0) {
    const usuario = rows[0];
    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + MINUTOS_EXPIRACAO_CODIGO * 60 * 1000);

    await pool.query(
      'UPDATE codigos_recuperacao_senha SET usado = 1 WHERE tipo = ? AND usuario_id = ? AND usado = 0',
      [tipo, usuario.id]
    );

    await pool.query(
      'INSERT INTO codigos_recuperacao_senha (tipo, usuario_id, codigo, expira_em) VALUES (?, ?, ?, ?)',
      [tipo, usuario.id, codigo, expiraEm]
    );

    const envio = await enviarEmailCodigoRecuperacao(usuario.email, codigo);
    return { encontrado: true, codigoSimulado: envio.simulado ? codigo : undefined };
  }

  return { encontrado: false };
}

async function enviarEmailCodigoRecuperacao(email, codigo) {
  if (!EMAIL_ATIVO) {
    console.log(`\n📧 [MODO SIMULADO] E-mail de recuperação de senha para ${email}`);
    console.log(`   Código: ${codigo}\n`);
    return { simulado: true };
  }
  await enviarEmailCodigo(email, codigo, 'login');
  return { simulado: false };
}

async function redefinirSenhaComCodigo(tipo, email, codigo, novaSenha) {
  const tabela = TABELAS[tipo];

  const [usuarios] = await pool.query(`SELECT id FROM ${tabela.nome} WHERE email = ?`, [email]);
  if (usuarios.length === 0) {
    return { sucesso: false, erro: 'Código inválido ou expirado.' };
  }
  const usuarioId = usuarios[0].id;

  const [codigos] = await pool.query(
    `SELECT id FROM codigos_recuperacao_senha
     WHERE tipo = ? AND usuario_id = ? AND codigo = ? AND usado = 0 AND expira_em > NOW()
     ORDER BY id DESC LIMIT 1`,
    [tipo, usuarioId, codigo]
  );

  if (codigos.length === 0) {
    return { sucesso: false, erro: 'Código inválido ou expirado.' };
  }

  await pool.query('UPDATE codigos_recuperacao_senha SET usado = 1 WHERE id = ?', [codigos[0].id]);

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await pool.query(`UPDATE ${tabela.nome} SET senha_hash = ? WHERE id = ?`, [senhaHash, usuarioId]);

  return { sucesso: true };
}

module.exports = { solicitarRecuperacao, redefinirSenhaComCodigo };
