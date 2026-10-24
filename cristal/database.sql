SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS cristal_floricultura
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cristal_floricultura;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  imagem_url VARCHAR(255) DEFAULT NULL,
  icone VARCHAR(60) DEFAULT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ordem_exibicao INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS icone VARCHAR(60) DEFAULT NULL;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS ativo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS ordem_exibicao INT NOT NULL DEFAULT 0;

CREATE TABLE produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  categoria_id INT NOT NULL,
  preco_custo DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_varejo DECIMAL(10,2) NOT NULL,
  preco_atacado DECIMAL(10,2) DEFAULT NULL,
  desconto_atacado_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  quantidade_minima_atacado INT NOT NULL DEFAULT 50,
  estoque INT NOT NULL DEFAULT 0,
  imagem_url VARCHAR(255) DEFAULT NULL,
  peso_kg DECIMAL(6,3) NOT NULL DEFAULT 0.3,
  altura_cm INT NOT NULL DEFAULT 15,
  largura_cm INT NOT NULL DEFAULT 20,
  comprimento_cm INT NOT NULL DEFAULT 20,
  possui_flores TINYINT(1) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) UNIQUE,
  email_verificado TINYINT(1) NOT NULL DEFAULT 0,
  endereco_rua VARCHAR(200),
  endereco_numero VARCHAR(20),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_estado CHAR(2),
  endereco_cep VARCHAR(12),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE codigos_verificacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  tipo ENUM('cadastro', 'login') NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  expira_em DATETIME NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE codigos_recuperacao_senha (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('admin', 'cliente') NOT NULL,
  usuario_id INT NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  expira_em DATETIME NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE melhor_envio_conexao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expira_em DATETIME NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE melhor_envio_oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE produto_cores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  nome VARCHAR(60) NOT NULL,
  codigo_hex VARCHAR(7) DEFAULT NULL,
  ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE produto_tamanhos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  tamanho VARCHAR(20) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE produto_variacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  cor_id INT DEFAULT NULL,
  tamanho_id INT DEFAULT NULL,
  estoque INT NOT NULL DEFAULT 0,
  UNIQUE KEY unico_produto_cor_tamanho (produto_id, cor_id, tamanho_id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (cor_id) REFERENCES produto_cores(id) ON DELETE CASCADE,
  FOREIGN KEY (tamanho_id) REFERENCES produto_tamanhos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE produto_imagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  imagem_url VARCHAR(255) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  cor_id INT DEFAULT NULL,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (cor_id) REFERENCES produto_cores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT DEFAULT NULL,
  numero_pedido VARCHAR(30) NOT NULL UNIQUE,
  cliente_nome VARCHAR(150) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  cliente_email VARCHAR(150),
  endereco_rua VARCHAR(200),
  endereco_numero VARCHAR(20),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_estado CHAR(2),
  endereco_cep VARCHAR(12),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  frete DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  tipo_pedido ENUM('varejo','atacado') NOT NULL DEFAULT 'varejo',
  status ENUM('pendente','pago','enviado','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  forma_pagamento VARCHAR(50) DEFAULT 'simulado',
  mp_preference_id VARCHAR(120) DEFAULT NULL,
  mp_payment_id VARCHAR(120) DEFAULT NULL,
  frete_descricao VARCHAR(150) DEFAULT NULL,
  frete_prazo_dias INT DEFAULT NULL,
  tipo_entrega ENUM('entrega_local','melhor_envio','combinado_atacado') NOT NULL DEFAULT 'melhor_envio',
  cidade_entrega VARCHAR(80) DEFAULT NULL,
  ponto_referencia VARCHAR(150) DEFAULT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT,
  nome_produto VARCHAR(150) NOT NULL,
  tamanho VARCHAR(20) DEFAULT NULL,
  cor VARCHAR(60) DEFAULT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  tipo_preco ENUM('varejo','atacado') NOT NULL DEFAULT 'varejo',
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE financeiro_lancamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('receita','despesa') NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE conteudo_imagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site ENUM('cristal','pan_cristal') NOT NULL,
  chave VARCHAR(60) NOT NULL,
  imagem_url VARCHAR(255) DEFAULT NULL,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conteudo_imagens_site_chave (site, chave)
) ENGINE=InnoDB;

INSERT INTO admins (nome, email, senha_hash) VALUES
('Administrador Cristal Floricultura', 'admin@cristalfloricultura.com.br', '$2b$10$8uDj9G7qBkNJV04KwE822uTU1S94ygFJaJbGTehm3E0ucilr/pQte');

INSERT INTO categorias (nome, slug) VALUES
('Buquês', 'buques'),
('Arranjos', 'arranjos'),
('Cestas de Presente', 'cestas-de-presente'),
('Plantas e Vasos', 'plantas-e-vasos'),
('Coroas e Ocasiões Especiais', 'coroas-e-ocasioes-especiais');

INSERT INTO produtos
  (nome, descricao, categoria_id, preco_custo, preco_varejo, preco_atacado, desconto_atacado_percentual, quantidade_minima_atacado, estoque, imagem_url, peso_kg, altura_cm, largura_cm, comprimento_cm, possui_flores, ativo)
VALUES
('Buquê de Rosas Vermelhas',
 'Buquê clássico com 12 rosas vermelhas selecionadas, folhagens e papel especial. Ideal para declarar amor e carinho.',
 1, 45.00, 129.90, NULL, 0, 50, 40, NULL, 0.8, 40, 25, 25, 1, 1),

('Buquê Campestre Misto',
 'Buquê romântico com flores do campo em tons pastel, para presentear em qualquer ocasião.',
 1, 38.00, 109.90, NULL, 0, 50, 35, NULL, 0.7, 38, 24, 24, 1, 1),

('Arranjo de Girassóis',
 'Arranjo alegre com girassóis e folhagens frescas em vaso de cerâmica.',
 2, 42.00, 119.90, NULL, 0, 50, 25, NULL, 1.5, 30, 22, 22, 1, 1),

('Arranjo de Orquídeas Brancas',
 'Arranjo sofisticado com orquídeas brancas naturais, perfeito para eventos e homenagens.',
 2, 68.00, 189.90, NULL, 0, 50, 18, NULL, 1.8, 35, 25, 25, 1, 1),

('Cesta de Café da Manhã',
 'Cesta especial com itens de café da manhã, chocolates e uma vela aromática — sem flores.',
 3, 55.00, 149.90, 35.00, 76.65, 12, 30, NULL, 2.2, 18, 30, 30, 0, 1),

('Cesta de Chocolates e Vinho',
 'Cesta presenteável com chocolates finos e vinho tinto selecionado — sem flores.',
 3, 72.00, 199.90, 35.00, 82.49, 12, 22, NULL, 2.6, 20, 32, 32, 0, 1),

('Vaso de Suculentas',
 'Conjunto de suculentas variadas em vaso decorativo de cerâmica — planta sem flor.',
 4, 25.00, 79.90, 35.00, 56.20, 12, 60, NULL, 1.0, 15, 15, 15, 0, 1),

('Orquídea Phalaenopsis em Vaso',
 'Orquídea Phalaenopsis natural em vaso decorativo, com flores.',
 4, 48.00, 139.90, NULL, 0, 50, 28, NULL, 1.4, 40, 18, 18, 1, 1),

('Coroa de Flores para Homenagem',
 'Coroa de flores naturais para homenagens e ocasiões especiais, montada sob encomenda.',
 5, 180.00, 449.90, NULL, 0, 50, 8, NULL, 6.0, 60, 60, 15, 1, 1),

('Ecobag Personalizada Cristal',
 'Ecobag de tecido personalizada com a marca Cristal Floricultura — item avulso sem flores.',
 3, 12.00, 39.90, 35.00, 12.28, 12, 90, NULL, 0.2, 5, 30, 35, 0, 1);

INSERT INTO pedidos
  (numero_pedido, cliente_nome, cliente_telefone, cliente_email,
   endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep,
   subtotal, frete, total, tipo_pedido, status, forma_pagamento, tipo_entrega, cidade_entrega, ponto_referencia, criado_em)
VALUES
('CRIS-00000001', 'Marcela Andrade', '(81) 99876-5432', 'marcela.andrade@email.com',
 NULL, NULL, NULL, 'Encruzilhada', 'PE', NULL,
 129.90, 40.00, 169.90, 'varejo', 'entregue', 'simulado', 'entrega_local', 'Encruzilhada - PE', 'Centro', DATE_SUB(NOW(), INTERVAL 55 DAY)),

('CRIS-00000002', 'Renata Silva', '(81) 98765-4321', 'renata.silva@email.com',
 NULL, NULL, NULL, 'Recife', 'PE', NULL,
 189.90, 100.00, 289.90, 'varejo', 'entregue', 'simulado', 'entrega_local', 'Recife - PE', 'Próximo ao Shopping Recife, portaria 2', DATE_SUB(NOW(), INTERVAL 48 DAY)),

('CRIS-00000003', 'Juliana Costa', '(87) 97654-3210', 'juliana.costa@email.com',
 'Rua do Catete', '55', 'Centro', 'Limoeiro', 'PE', '55700-000',
 119.90, 80.00, 199.90, 'varejo', 'entregue', 'simulado', 'entrega_local', 'Limoeiro - PE', 'Centro', DATE_SUB(NOW(), INTERVAL 40 DAY)),

('CRIS-00000004', 'Fernanda Lima', '(81) 96543-2109', 'fernanda.lima@email.com',
 'Av. Beira Mar', '300', 'Meireles', 'Surubim', 'PE', '55750-000',
 449.90, 0.00, 449.90, 'atacado', 'entregue', 'simulado', 'combinado_atacado', NULL, NULL, DATE_SUB(NOW(), INTERVAL 33 DAY)),

('CRIS-00000005', 'Patrícia Souza', '(41) 95432-1098', 'patricia.souza@email.com',
 'Rua XV de Novembro', '210', 'Centro', 'Curitiba', 'PR', '80020-000',
 199.90, 40.00, 239.90, 'varejo', 'enviado', 'simulado', 'melhor_envio', NULL, NULL, DATE_SUB(NOW(), INTERVAL 25 DAY)),

('CRIS-00000006', 'Camila Ferreira', '(62) 94321-0987', 'camila.ferreira@email.com',
 'Av. Goiás', '75', 'Setor Central', 'Goiânia', 'GO', '74010-000',
 79.80, 35.00, 114.80, 'varejo', 'pago', 'simulado', 'melhor_envio', NULL, NULL, DATE_SUB(NOW(), INTERVAL 18 DAY)),

('CRIS-00000007', 'Aline Rocha', '(81) 93210-9876', 'aline.rocha@email.com',
 NULL, NULL, NULL, 'João Alfredo', 'PE', NULL,
 109.90, 60.00, 169.90, 'varejo', 'pago', 'simulado', 'entrega_local', 'João Alfredo - PE', 'Centro', DATE_SUB(NOW(), INTERVAL 10 DAY)),

('CRIS-00000008', 'Beatriz Martins', '(51) 92109-8765', 'beatriz.martins@email.com',
 'Av. Ipiranga', '450', 'Centro Histórico', 'Porto Alegre', 'RS', '90160-000',
 39.90, 30.00, 69.90, 'varejo', 'pendente', 'simulado', 'melhor_envio', NULL, NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),

('CRIS-00000009', 'Larissa Nunes', '(81) 91098-7654', 'larissa.nunes@email.com',
 NULL, NULL, NULL, 'Santa Maria do Cambucá', 'PE', NULL,
 109.90, 50.00, 159.90, 'varejo', 'pago', 'simulado', 'entrega_local', 'Santa Maria do Cambucá - PE', 'Centro', DATE_SUB(NOW(), INTERVAL 1 DAY)),

('CRIS-00000010', 'Vanessa Alves', '(81) 90987-6543', 'vanessa.alves@email.com',
 NULL, NULL, NULL, 'Bom Jardim', 'PE', NULL,
 189.80, 60.00, 249.80, 'varejo', 'cancelado', 'simulado', 'entrega_local', 'Bom Jardim - PE', 'Centro', NOW());

INSERT INTO clientes (nome, email, senha_hash, telefone, email_verificado, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep) VALUES
('Cliente Teste', 'cliente@teste.com', '$2b$10$83N6iOXOjAGz9iWpkPWAheRho7iKpNecyV9TSuH6B71zW9Yex7orG', '(81) 98888-7777', 1, 'Rua Exemplo', '100', 'Centro', 'Surubim', 'PE', '55750-000');

INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, quantidade, preco_unitario, preco_custo_unitario, subtotal, tipo_preco) VALUES
(1, 1, 'Buquê de Rosas Vermelhas', 1, 129.90, 45.00, 129.90, 'varejo'),

(2, 4, 'Arranjo de Orquídeas Brancas', 1, 189.90, 68.00, 189.90, 'varejo'),

(3, 3, 'Arranjo de Girassóis', 1, 119.90, 42.00, 119.90, 'varejo'),

(4, 9, 'Coroa de Flores para Homenagem', 1, 449.90, 180.00, 449.90, 'atacado'),

(5, 8, 'Orquídea Phalaenopsis em Vaso', 1, 139.90, 48.00, 139.90, 'varejo'),
(5, 10, 'Ecobag Personalizada Cristal', 1, 60.00, 12.00, 60.00, 'varejo'),

(6, 10, 'Ecobag Personalizada Cristal', 2, 39.90, 12.00, 79.90, 'varejo'),

(7, 2, 'Buquê Campestre Misto', 1, 109.90, 38.00, 109.90, 'varejo'),

(8, 10, 'Ecobag Personalizada Cristal', 1, 39.90, 12.00, 39.90, 'varejo'),

(9, 2, 'Buquê Campestre Misto', 1, 109.90, 38.00, 109.90, 'varejo'),

(10, 2, 'Buquê Campestre Misto', 1, 109.90, 38.00, 109.90, 'varejo'),
(10, 7, 'Vaso de Suculentas', 1, 79.90, 25.00, 79.90, 'varejo');

INSERT INTO financeiro_lancamentos (tipo, descricao, valor, data) VALUES
('despesa', 'Aluguel da floricultura', 1500.00, DATE_SUB(CURDATE(), INTERVAL 55 DAY)),
('despesa', 'Anúncios Instagram/Facebook', 350.00, DATE_SUB(CURDATE(), INTERVAL 50 DAY)),
('despesa', 'Compra de flores e insumos', 1800.00, DATE_SUB(CURDATE(), INTERVAL 45 DAY)),
('despesa', 'Aluguel da floricultura', 1500.00, DATE_SUB(CURDATE(), INTERVAL 25 DAY)),
('despesa', 'Anúncios Instagram/Facebook', 400.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY)),
('despesa', 'Embalagens e fitas personalizadas', 260.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
('despesa', 'Aluguel da floricultura', 1500.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
('receita', 'Venda direta na loja física (dinheiro)', 380.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY)),
('receita', 'Comissão de indicação de fornecedor', 150.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY));
