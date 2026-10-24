const nodemailer = require('nodemailer');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_ATIVO = Boolean(BREVO_API_KEY);

const SMTP_ATIVO = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const EMAIL_ATIVO = BREVO_ATIVO || SMTP_ATIVO;

const transporter = SMTP_ATIVO
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

function extrairRemetente() {
  const bruto = process.env.SMTP_FROM || process.env.SMTP_USER || 'contato@cristalfloricultura.com.br';
  const match = bruto.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim() || 'Cristal Floricultura', email: match[2].trim() };
  }
  return { name: 'Cristal Floricultura', email: bruto.trim() };
}

async function testarConexaoEmail() {
  if (BREVO_ATIVO) {
    console.log('✅ Envio de e-mail via API do Brevo está ativo.');
    return;
  }
  if (!SMTP_ATIVO) return;
  try {
    await transporter.verify();
    console.log(`✅ Conectado ao servidor de e-mail com sucesso (${process.env.SMTP_USER})`);
  } catch (err) {
    console.error(`\n❌ Falha ao conectar ao servidor de e-mail via SMTP: ${err.message}`);
    console.error('   Se estiver rodando no Render (ou outra hospedagem gratuita), isso é');
    console.error('   esperado: eles bloqueiam as portas de SMTP no plano grátis. Use a API');
    console.error('   do Brevo em vez disso (variável BREVO_API_KEY) — veja o .env.example.\n');
  }
}

async function enviarViaBrevoAPI(destinatario, assunto, corpo) {
  const remetente = extrairRemetente();

  const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: remetente,
      to: [{ email: destinatario }],
      subject: assunto,
      textContent: corpo,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`API do Brevo recusou o envio (status ${resposta.status}): ${detalhe}`);
  }

  return resposta.json();
}

async function enviarViaSmtp(destinatario, assunto, corpo) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destinatario,
    subject: assunto,
    text: corpo,
  });

  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`O servidor de e-mail recusou o envio para ${info.rejected.join(', ')}.`);
  }
  return info;
}

async function enviarEmailGenerico(destinatario, assunto, corpo) {
  if (!EMAIL_ATIVO) {
    console.log(`\n📧 [MODO SIMULADO] E-mail para ${destinatario}: ${assunto}\n`);
    return { simulado: true };
  }

  try {
    if (BREVO_ATIVO) {
      const resultado = await enviarViaBrevoAPI(destinatario, assunto, corpo);
      console.log(`\n✅ E-mail "${assunto}" enviado via API do Brevo para ${destinatario} (id: ${resultado.messageId})\n`);
    } else {
      const info = await enviarViaSmtp(destinatario, assunto, corpo);
      console.log(`\n✅ E-mail "${assunto}" enviado via SMTP para ${destinatario} (id: ${info.messageId})\n`);
    }
    return { simulado: false };
  } catch (err) {
    console.error(`\n❌ Falha ao enviar e-mail "${assunto}" para ${destinatario}: ${err.message}\n`);
    throw err;
  }
}

async function enviarEmailCodigo(destinatario, codigo, tipo) {
  const assunto = tipo === 'cadastro'
    ? 'Confirme seu cadastro na Cristal Floricultura'
    : 'Seu código de acesso Cristal Floricultura';

  const corpo = tipo === 'cadastro'
    ? `Seu código de confirmação de cadastro é: ${codigo}\n\nEle expira em 10 minutos.`
    : `Seu código de acesso é: ${codigo}\n\nEle expira em 10 minutos. Se não foi você tentando entrar, ignore este e-mail.`;

  return enviarEmailGenerico(destinatario, assunto, corpo);
}

module.exports = { enviarEmailCodigo, enviarEmailGenerico, testarConexaoEmail, EMAIL_ATIVO };
