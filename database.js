const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function initDB() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'rifas.db');
    let db;

    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(filebuffer);
    } else {
        db = new SQL.Database();
    }

    // Criação/Garantia das tabelas
    db.run(`
        CREATE TABLE IF NOT EXISTS rifas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT,
            premio_manual TEXT,
            imagem TEXT,
            descricao TEXT,
            tipo_pix TEXT,
            chave_pix TEXT,
            whatsapp_suporte TEXT,
            modalidade TEXT,
            preco REAL,
            dataEncerramento TEXT,
            ativa INTEGER DEFAULT 1
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            whatsapp TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bilhetes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rifa_id INTEGER,
            numero TEXT,
            status TEXT DEFAULT 'disponivel',
            cliente_id INTEGER,
            expira_em TEXT
        );
    `);

    // Tenta adicionar a coluna premio_manual caso o banco já existisse
    try {
        db.run("ALTER TABLE rifas ADD COLUMN premio_manual TEXT;");
    } catch (e) {
        // Coluna já existe, ignora o erro
    }

    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));

    return db;
}

module.exports = initDB;

