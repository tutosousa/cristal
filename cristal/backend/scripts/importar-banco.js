const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

function dividirComandos(sql) {
  const comandos = [];
  let atual = '';
  let aspas = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const prox = sql[i + 1];
    if (aspas) {
      atual += c;
      if (c === '\\') { atual += prox || ''; i++; }
      else if (c === aspas) {
        if (prox === aspas) { atual += prox; i++; } else aspas = null;
      }
      continue;
    }
    if (c === '-' && prox === '-') { while (i < sql.length && sql[i] !== '\n') i++; atual += '\n'; continue; }
    if (c === '/' && prox === '*') { i += 2; while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { aspas = c; atual += c; continue; }
    if (c === ';') { if (atual.trim()) comandos.push(atual.trim()); atual = ''; continue; }
    atual += c;
  }
  if (atual.trim()) comandos.push(atual.trim());
  return comandos;
}

function perguntar(rl, texto, padrao) {
  return new Promise((resolve) => rl.question(texto, (r) => resolve(r.trim() || padrao || '')));
}

(async () => {
  const arquivo = process.argv[2] || path.join(__dirname, '..', '..', 'database.sql');
  const comandos = dividirComandos(fs.readFileSync(arquivo, 'utf8'));
  console.log(`${comandos.length} comandos encontrados em ${arquivo}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const host = await perguntar(rl, 'Host: ');
  const port = Number(await perguntar(rl, 'Porta [4000]: ', '4000'));
  const user = await perguntar(rl, 'Usuário: ');
  const password = await perguntar(rl, 'Senha: ');
  rl.close();

  const conn = await mysql.createConnection({
    host, port, user, password,
    ssl: { rejectUnauthorized: false },
    charset: 'utf8mb4',
  });
  console.log('\nConectado. Importando...');

  let ok = 0;
  for (const cmd of comandos) {
    try {
      await conn.query(cmd);
      ok++;
    } catch (err) {
      console.error(`\nERRO no comando ${ok + 1}: ${err.message}\n--> ${cmd.slice(0, 160)}...`);
      await conn.end();
      process.exit(1);
    }
  }
  await conn.end();
  console.log(`\nPronto: ${ok} comandos executados com sucesso.`);
})().catch((e) => { console.error('Falha:', e.message); process.exit(1); });
