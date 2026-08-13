const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const upload = multer({ dest: 'uploads/' });

let db;
const dbFile = './database.sqlite';
function salvarDB() { if(db) fs.writeFileSync(dbFile, Buffer.from(db.export())); }

let redesSociais = { facebook: '', facebookAtivo: false, instagram: '', instagramAtivo: false, whatsapp: '', whatsappAtivo: false, grupoWhatsapp: '', grupoAtivo: false };
if (fs.existsSync('./redes.json')) redesSociais = JSON.parse(fs.readFileSync('./redes.json'));

const adminNav = `<div style="background:#e2e8f0; padding:10px; border-radius:6px; margin-bottom:20px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
    <a href="/admin" style="background:#0284c7; color:white; padding:8px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">📋 Rifas</a>
    <a href="/admin/nova-rifa" style="background:#22c55e; color:white; padding:8px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">➕ Nova</a>
    <a href="/admin/config-pix" style="background:#64748b; color:white; padding:8px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">⚙️ Config</a>
</div>`;

initSqlJs().then(SQL => {
    if (fs.existsSync(dbFile)) db = new SQL.Database(fs.readFileSync(dbFile));
    else {
        db = new SQL.Database();
        db.run(`CREATE TABLE rifas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, modalidade TEXT, preco REAL, dataEncerramento TEXT, imagem TEXT, tipo_pix TEXT, chave_pix TEXT, whatsapp_suporte TEXT, premio_manual TEXT, ativa INTEGER DEFAULT 1); CREATE TABLE clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, whatsapp TEXT); CREATE TABLE bilhetes (id INTEGER PRIMARY KEY AUTOINCREMENT, rifa_id INTEGER, numero TEXT, status TEXT, cliente_id INTEGER, expira_em TEXT);`);
        salvarDB();
    }
});

app.get('/admin', (req, res) => {
    const stmt = db.prepare("SELECT * FROM rifas ORDER BY id DESC");
    const rifas = [];
    while (stmt.step()) rifas.push(stmt.getAsObject());
    stmt.free();
    let lista = rifas.map(r => `
        <div style="background:#fff; color:#0f172a; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>#${r.id} - ${r.titulo}</h3> 
                <span style="background:${r.ativa?'#22c55e':'#ef4444'}; color:white; padding:3px 8px; border-radius:4px; font-size:12px;">${r.ativa?'ATIVA':'INATIVA'}</span>
            </div>
            <p style="margin:5px 0;">Preço: R$ ${Number(r.preco).toFixed(2)} | Modalidade: ${r.modalidade}</p>
            <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                <a href="/gspremiacoes/rifa/${r.id}" target="_blank" style="background:#8b5cf6; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">👁️ Ver Rifa</a>
                <a href="/admin/editar-rifa/${r.id}" style="background:#0284c7; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">✏️ Editar</a>
                <a href="/admin/status/${r.id}" style="background:#f97316; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">${r.ativa?'Desativar':'Ativar'}</a>
                <a href="/admin/excluir/${r.id}" onclick="return confirm('Excluir rifa?')" style="background:#ef4444; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-weight:bold;">🗑️ Excluir</a>
            </div>
        </div>`).join('');
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#f1f5f9; padding:15px; font-family:sans-serif;"><h2>⚙️ PAINEL ADM - GS PREMIAÇÕES</h2>${adminNav}${lista || '<p>Nenhuma rifa cadastrada.</p>'}</body></html>`);
});

app.get('/admin/editar-rifa/:id', (req, res) => {
    const stmt = db.prepare("SELECT * FROM rifas WHERE id = ?");
    stmt.bind([req.params.id]); stmt.step();
    const r = stmt.getAsObject(); stmt.free();

    if (!r.id) return res.send("Rifa não encontrada.");

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:15px;background:#f1f5f9;} input,select,textarea{width:100%;padding:10px;margin-bottom:10px;box-sizing:border-box;}</style></head><body><h2>✏️ Editar Rifa #${r.id}</h2>${adminNav}<form action="/admin/atualizar-rifa/${r.id}" method="POST" enctype="multipart/form-data"><label>Título:</label><input type="text" name="titulo" value="${r.titulo}" required /><label>Prêmios (Manual):</label><textarea name="premio_manual">${r.premio_manual || ''}</textarea><label>Imagem Atual: ${r.imagem}</label><input type="file" name="imagem" /><label>Descrição:</label><textarea name="descricao">${r.descricao || ''}</textarea><label>Tipo PIX:</label><select name="tipo_pix"><option value="CPF" ${r.tipo_pix==='CPF'?'selected':''}>CPF</option><option value="Celular" ${r.tipo_pix==='Celular'?'selected':''}>Celular</option><option value="E-mail" ${r.tipo_pix==='E-mail'?'selected':''}>E-mail</option><option value="CNPJ" ${r.tipo_pix==='CNPJ'?'selected':''}>CNPJ</option></select><label>Chave Pix:</label><input type="text" name="chave_pix" value="${r.chave_pix || ''}" /><label>WhatsApp Suporte:</label><input type="text" name="whatsapp_suporte" value="${r.whatsapp_suporte || ''}" /><label>Preço por Cota (R$):</label><input type="number" step="0.01" name="preco" value="${r.preco}" required /><label>Data Encerramento:</label><input type="datetime-local" name="dataEncerramento" value="${r.dataEncerramento || ''}" required /><button type="submit" style="background:#0284c7;color:white;padding:12px;width:100%;border:none;font-weight:bold;margin-top:10px;">Salvar Alterações</button></form></body></html>`);
});

app.post('/admin/atualizar-rifa/:id', upload.single('imagem'), (req, res) => {
    const { titulo, descricao, preco, dataEncerramento, tipo_pix, chave_pix, whatsapp_suporte, premio_manual } = req.body;
    const rifaId = req.params.id;

    if (req.file) {
        const imagem = '/uploads/' + req.file.filename;
        db.run(`UPDATE rifas SET titulo=?, descricao=?, preco=?, dataEncerramento=?, imagem=?, tipo_pix=?, chave_pix=?, whatsapp_suporte=?, premio_manual=? WHERE id=?`,
            [titulo, descricao, preco, dataEncerramento, imagem, tipo_pix, chave_pix, whatsapp_suporte, premio_manual, rifaId]);
    } else {
        db.run(`UPDATE rifas SET titulo=?, descricao=?, preco=?, dataEncerramento=?, tipo_pix=?, chave_pix=?, whatsapp_suporte=?, premio_manual=? WHERE id=?`,
            [titulo, descricao, preco, dataEncerramento, tipo_pix, chave_pix, whatsapp_suporte, premio_manual, rifaId]);
    }

    salvarDB();
    res.send('<script>alert("Rifa atualizada com sucesso!"); window.location.href="/admin";</script>');
});

app.get('/admin/nova-rifa', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:15px;background:#f1f5f9;} input,select,textarea{width:100%;padding:10px;margin-bottom:10px;box-sizing:border-box;}</style></head><body><h2>➕ Criar Rifa</h2>${adminNav}<form action="/admin/criar-rifa" method="POST" enctype="multipart/form-data"><input type="text" name="titulo" placeholder="Título" required /><textarea name="premio_manual" placeholder="Prêmios (Manual)"></textarea><input type="file" name="imagem" /><textarea name="descricao" placeholder="Descrição"></textarea><select name="tipo_pix"><option value="CPF">CPF</option><option value="Celular">Celular</option><option value="E-mail">E-mail</option><option value="CNPJ">CNPJ</option></select><input type="text" name="chave_pix" placeholder="Chave Pix" /><input type="text" name="whatsapp_suporte" placeholder="WhatsApp Suporte" /><select name="modalidade"><option value="grupo">Grupo (25)</option><option value="dezena">Dezena (100)</option><option value="centena">Centena (1000)</option><option value="milhar">Milhar (10000)</option></select><input type="number" step="0.01" name="preco" value="5.00" required /><input type="datetime-local" name="dataEncerramento" required /><button type="submit" style="background:#22c55e;color:white;padding:12px;width:100%;border:none;font-weight:bold;">Publicar</button></form></body></html>`);
});

app.get('/admin/config-pix', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:15px;background:#f1f5f9;}</style></head><body><h2>⚙️ Configurações</h2>${adminNav}<form action="/admin/salvar-redes" method="POST"><label><input type="checkbox" name="facebookAtivo" ${redesSociais.facebookAtivo?'checked':''}> Facebook</label><input type="text" name="facebook" value="${redesSociais.facebook}" style="width:100%;margin-bottom:10px;"><br><label><input type="checkbox" name="instagramAtivo" ${redesSociais.instagramAtivo?'checked':''}> Instagram</label><input type="text" name="instagram" value="${redesSociais.instagram}" style="width:100%;margin-bottom:10px;"><br><label><input type="checkbox" name="whatsappAtivo" ${redesSociais.whatsappAtivo?'checked':''}> WhatsApp Suporte</label><input type="text" name="whatsapp" value="${redesSociais.whatsapp}" style="width:100%;margin-bottom:10px;"><br><label><input type="checkbox" name="grupoAtivo" ${redesSociais.grupoAtivo?'checked':''}> Grupo VIP</label><input type="text" name="grupoWhatsapp" value="${redesSociais.grupoWhatsapp}" style="width:100%;margin-bottom:10px;"><br><button type="submit" style="background:#0284c7;color:white;padding:12px;width:100%;border:none;font-weight:bold;">Salvar</button></form></body></html>`);
});

const headerHTML = `
    <div style="background:#1e293b; padding:15px; text-align:center; color:white; border-bottom:2px solid #334155;">
        <h1 style="margin:0; font-size:24px; color:#38bdf8;">GS PREMIAÇÕES</h1>
        <div style="margin-top:10px; display:flex; justify-content:center; gap:15px; flex-wrap:wrap;">
            <a href="/gspremiacoes/home" style="color:#f8fafc; text-decoration:none; font-weight:bold;">🏠 Início</a>
            <a href="/gspremiacoes/meus-bilhetes" style="color:#f8fafc; text-decoration:none; font-weight:bold;">🎟️ Meus Bilhetes</a>
        </div>
    </div>
`;

function getFooterHTML() {
    let html = `<footer style="background:#1e293b; color:#94a3b8; text-align:center; padding:20px; margin-top:30px; border-top:1px solid #334155;"><div style="max-width:600px; margin:0 auto;"><p style="color:#f8fafc; font-weight:bold; font-size:16px; margin:0 0 5px 0;">🛡️ GS PREMIAÇÕES - PLATAFORMA SEGURA</p><p style="font-size:12px; margin:0 0 10px 0;">Sorteios 100% transparentes baseados na Extração da Loteria Federal.</p><div style="display:inline-block; border:1px solid #22c55e; color:#22c55e; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:bold;">✓ CERTIFICADO DE GARANTIA & SEGURANÇA</div><p style="font-size:11px; margin-top:15px; color:#64748b;">© GS Premiações - Todos os direitos reservados.</p></div></footer>`;
    if (redesSociais.grupoAtivo && redesSociais.grupoWhatsapp) { html += `<a href="${redesSociais.grupoWhatsapp}" target="_blank" style="position:fixed; bottom:90px; right:15px; background:#0284c7; color:white; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:22px; box-shadow:0 4px 8px rgba(0,0,0,0.5); z-index:999;">👥</a>`; }
    if (redesSociais.whatsappAtivo && redesSociais.whatsapp) { html += `<a href="https://wa.me/${redesSociais.whatsapp}" target="_blank" style="position:fixed; bottom:25px; right:15px; background:#25d366; color:white; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:24px; box-shadow:0 4px 8px rgba(0,0,0,0.5); z-index:999;">💬</a>`; }
    return html;
}

app.get('/gspremiacoes/home', (req, res) => {
    const stmt = db.prepare("SELECT * FROM rifas WHERE ativa = 1 ORDER BY id DESC");
    const rifas = [];
    while (stmt.step()) rifas.push(stmt.getAsObject());
    stmt.free();
    let cards = rifas.map(r => `<div style="background:#1e293b; border-radius:8px; overflow:hidden; margin-bottom:20px; box-shadow:0 4px 6px rgba(0,0,0,0.3);"><img src="${r.imagem}" style="width:100%; height:200px; object-fit:cover;" /><div style="padding:15px;"><h3 style="margin:0 0 10px 0; color:#f8fafc;">${r.titulo}</h3><p style="color:#38bdf8; font-weight:bold; font-size:18px; margin:5px 0;">R$ ${Number(r.preco).toFixed(2)} / cota</p><a href="/gspremiacoes/rifa/${r.id}" style="display:block; text-align:center; background:#22c55e; color:white; padding:12px; border-radius:5px; text-decoration:none; font-weight:bold; margin-top:10px;">Comprar Cotas</a></div></div>`).join('');
    res.send(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GS Premiações</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;margin:0;}.container{max-width:600px;margin:20px auto;padding:0 15px;}</style></head><body>${headerHTML}<div class="container">${cards || '<p style="text-align:center;">Nenhuma rifa disponível no momento.</p>'}</div>${getFooterHTML()}</body></html>`);
});
app.get('/gspremiacoes/rifa/:id', (req, res) => {
    const id = req.params.id;
    const stmtRifa = db.prepare("SELECT * FROM rifas WHERE id = ?");
    stmtRifa.bind([id]); stmtRifa.step();
    const rifa = stmtRifa.getAsObject(); stmtRifa.free();
    if (!rifa.id) return res.send('Rifa não encontrada.');

    const stmtB = db.prepare("SELECT * FROM bilhetes WHERE rifa_id = ?");
    stmtB.bind([id]);
    const bilhetes = [];
    while (stmtB.step()) bilhetes.push(stmtB.getAsObject());
    stmtB.free();

    const livres = bilhetes.filter(b => b.status === 'livre');
    const totalCotas = bilhetes.length;
    const cotasVendidas = totalCotas - livres.length;
    const porcentagemVendida = Math.round((cotasVendidas / (totalCotas || 1)) * 100);

    let bilhetesHTML = bilhetes.map(b => {
        let bg = '#334155';
        if (b.status === 'reservado') bg = '#eab308';
        if (b.status === 'pago') bg = '#ef4444';
        return `<div class="cota ${b.status}" id="cota-${b.numero}" data-num="${b.numero}" onclick="selecionarCota(this, '${b.status}')" style="background:${bg}; color:white; padding:8px; text-align:center; border-radius:4px; font-weight:bold; cursor:pointer;">${b.numero}</div>`;
    }).join('');

    const pixParaQr = rifa.chave_pix || '0000';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixParaQr)}`;

    res.send(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${rifa.titulo} | GS Premiações</title><style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding-bottom: 60px; } .container { max-width: 600px; margin: 20px auto; padding: 0 15px; } .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 8px; margin: 15px 0; } .cota.selecionada { background: #22c55e !important; } .btn { width:100%; padding:15px; background:#22c55e; color:white; border:none; border-radius:8px; font-size:16px; font-weight:bold; cursor:pointer; } .btn-surpresa { background:#0284c7; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; } .modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); align-items:center; justify-content:center; z-index:1000; } .modal-content { background:#1e293b; padding:20px; border-radius:8px; width:90%; max-width:400px; text-align:center; max-height:90vh; overflow-y:auto; } .progress-bar-bg { background: #334155; border-radius: 8px; height: 16px; width: 100%; overflow: hidden; margin-top: 8px; } .progress-bar-fill { background: #22c55e; height: 100%; transition: width 0.3s ease; }</style></head><body>${headerHTML}<div class="container"><h2>${rifa.titulo}</h2><img src="${rifa.imagem}" style="width:100%; border-radius:8px; max-height:300px; object-fit:cover;" />${rifa.premio_manual ? `<p style="color:#eab308; font-weight:bold;">🎁 Prêmios: ${rifa.premio_manual}</p>` : ''}<div style="background:#1e293b; padding:15px; border-radius:8px; margin:15px 0;"><div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:bold;"><span>Cotas Vendidas: <b style="color:#38bdf8;">${cotasVendidas}/${totalCotas} (${porcentagemVendida}%)</b></span><span>Restantes: <b style="color:#22c55e;">${livres.length}</b></span></div><div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${porcentagemVendida}%;"></div></div><div style="display:flex; justify-content:space-between; margin-top:10px; font-size:14px;"><span>Preço por Cota: <b style="color:#38bdf8;">R$ ${Number(rifa.preco).toFixed(2)}</b></span></div></div><div style="margin:15px 0; background:#1e293b; padding:12px; border-radius:6px;"><p style="margin:0 0 10px 0; font-weight:bold;">🎲 Cotas Aleatórias (Surpresinha):</p><div style="display:flex; gap:8px; flex-wrap:wrap;"><button class="btn-surpresa" onclick="selecionarAleatorio(5)">+05 Cotas</button><button class="btn-surpresa" onclick="selecionarAleatorio(10)">+10 Cotas</button><button class="btn-surpresa" onclick="selecionarAleatorio(20)">+20 Cotas</button><button class="btn-surpresa" style="background:#ef4444;" onclick="limparSelecao()">Limpar</button></div></div><div class="grid">${bilhetesHTML}</div><button class="btn" onclick="abrirCheckout()">Participar do Sorteio</button></div><div id="modal" class="modal"><div class="modal-content"><h3>Pagamento via PIX</h3><div style="background:#0f172a; padding:10px; border-radius:6px; margin:10px 0;"><p style="margin:3px 0; font-size:14px;">Cotas: <b id="qtdCotasTxt" style="color:#38bdf8;">0</b></p><p style="margin:3px 0; font-size:18px; font-weight:bold;">VALOR TOTAL: <span id="totalPagarTxt" style="color:#22c55e;">R$ 0,00</span></p></div><p>Tempo restante para pagar: <b id="timer" style="color:#ef4444; font-size:18px;">05:00</b></p><img src="${qrUrl}" alt="QR Code PIX" style="width:170px; height:170px; margin:10px auto; border-radius:8px; background:white; padding:5px;" /><p style="margin:5px 0; font-size:14px;"><b>Tipo de Chave:</b> ${rifa.tipo_pix || 'Chave Pix'}</p><input type="text" id="chavePixInput" value="${rifa.chave_pix || ''}" readonly style="width:100%; padding:10px; margin:10px 0; text-align:center; box-sizing:border-box; border-radius:4px; border:none;" /><button onclick="copiarPix()" style="padding:10px; background:#0284c7; color:white; border:none; border-radius:4px; width:100%; font-weight:bold; cursor:pointer;">📋 Copiar Chave Pix</button><br><br><a id="btnZap" href="#" target="_blank" style="display:block; padding:12px; background:#25d366; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">💬 Enviar Comprovante no WhatsApp</a></div></div><script>let selecionadas = []; let livresArray = [${livres.map(l => `'${l.numero}'`).join(',')}]; const precoUnitario = ${Number(rifa.preco)}; function selecionarCota(el, status) { if (status !== 'livre') return; const num = el.getAttribute('data-num'); if (selecionadas.includes(num)) { selecionadas = selecionadas.filter(n => n !== num); el.classList.remove('selecionada'); } else { selecionadas.push(num); el.classList.add('selecionada'); } } function limparSelecao() { selecionadas.forEach(num => { const el = document.getElementById('cota-' + num); if (el) el.classList.remove('selecionada'); }); selecionadas = []; } function selecionarAleatorio(qtd) { limparSelecao(); let embaralhado = [...livresArray].sort(() => 0.5 - Math.random()); let escolhidos = embaralhado.slice(0, qtd); escolhidos.forEach(num => { const el = document.getElementById('cota-' + num); if (el) { selecionadas.push(num); el.classList.add('selecionada'); } }); } function abrirCheckout() { if (selecionadas.length === 0) return alert('Selecione pelo menos uma cota!'); let nome = prompt('Digite seu Nome completo:'); let zap = prompt('Digite seu WhatsApp (com DDD):'); if (!nome || !zap) return; const totalSoma = (selecionadas.length * precoUnitario).toFixed(2); document.getElementById('qtdCotasTxt').innerText = selecionadas.length; document.getElementById('totalPagarTxt').innerText = 'R$ ' + totalSoma; fetch('/reservar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rifa_id: ${rifa.id}, numeros: selecionadas, nome, whatsapp: zap }) }).then(r => r.json()).then(data => { document.getElementById('modal').style.display = 'flex'; const msg = encodeURIComponent('Olá, acabei de reservar ' + selecionadas.length + ' cotas (' + selecionadas.join(', ') + ') na rifa ${rifa.titulo}. Total a pagar: R$ ' + totalSoma + '. Segue comprovante!'); document.getElementById('btnZap').href = 'https://wa.me/55${rifa.whatsapp_suporte || redesSociais.whatsapp}?text=' + msg; iniciarTimer(300); }); } function copiarPix() { const input = document.getElementById('chavePixInput'); input.select(); navigator.clipboard.writeText(input.value); alert('Chave Pix copiada para a área de transferência!'); } function iniciarTimer(segundos) { let timer = segundos; const interval = setInterval(() => { let m = Math.floor(timer / 60); let s = timer % 60; document.getElementById('timer').innerText = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0'); if (--timer < 0) { clearInterval(interval); alert('Tempo de reserva esgotado!'); location.reload(); } }, 1000); }</script>${getFooterHTML()}</body></html>`);
});

app.get('/gspremiacoes/meus-bilhetes', (req, res) => {
    const zap = req.query.zap || '';
    let bilhetesComprados = [];
    if (zap) {
        const stmt = db.prepare(`SELECT b.numero, b.status, r.titulo, c.nome, c.whatsapp FROM bilhetes b JOIN rifas r ON b.rifa_id = r.id JOIN clientes c ON b.cliente_id = c.id WHERE c.whatsapp LIKE ?`);
        stmt.bind([`%${zap}%`]);
        while (stmt.step()) bilhetesComprados.push(stmt.getAsObject());
        stmt.free();
    }
    let cards = bilhetesComprados.map(b => `<div style="background:#1e293b; padding:15px; border-radius:8px; border-left:4px solid ${b.status==='pago'?'#22c55e':'#eab308'}; margin-bottom:10px;"><h4 style="margin:0; color:#f8fafc;">${b.titulo}</h4><p style="margin:5px 0;"><b>Cota:</b> <span style="color:#38bdf8; font-size:18px; font-weight:bold;">${b.numero}</span></p><p style="margin:0;"><b>Status:</b> ${b.status === 'pago' ? '<span style="color:#22c55e;">PAGO (CONFIRMADO)</span>' : '<span style="color:#eab308;">PENDENTE DE PAGAMENTO</span>'}</p></div>`).join('');
    res.send(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Meus Bilhetes | GS Premiações</title><style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; margin: 0; } .container { max-width: 600px; margin: 20px auto; padding: 0 15px; } input, button { width:100%; padding:12px; margin-top:10px; border-radius:6px; border:none; box-sizing:border-box; } button { background:#0284c7; color:white; font-weight:bold; cursor:pointer; }</style></head><body>${headerHTML}<div class="container"><h2>🎟️ Meus Bilhetes</h2><form method="GET"><label>Digite o WhatsApp usado no cadastro:</label><input type="text" name="zap" value="${zap}" placeholder="Ex: 71999998888" required /><button type="submit">Buscar Bilhetes</button></form><hr style="border-color:#334155; margin:20px 0;">${cards || (zap ? '<p style="color:#94a3b8;">Nenhum bilhete encontrado para este número.</p>' : '')}</div>${getFooterHTML()}</body></html>`);
});

app.post('/reservar', (req, res) => {
    const { rifa_id, numeros, nome, whatsapp } = req.body;
    db.run(`INSERT INTO clientes (nome, whatsapp) VALUES (?, ?)`, [nome, whatsapp]);
    const stmt = db.prepare("SELECT last_insert_rowid() as id");
    stmt.step();
    const clienteId = stmt.getAsObject().id;
    stmt.free();
    const expira = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    numeros.forEach(num => {
        db.run(`UPDATE bilhetes SET status = 'reservado', cliente_id = ?, expira_em = ? WHERE rifa_id = ? AND numero = ?`, [clienteId, expira, rifa_id, num]);
    });
    salvarDB();
    res.json({ status: 'ok' });
});

app.post('/admin/salvar-redes', (req, res) => {
    redesSociais.facebook = req.body.facebook || '';
    redesSociais.facebookAtivo = req.body.facebookAtivo === 'on';
    redesSociais.instagram = req.body.instagram || '';
    redesSociais.instagramAtivo = req.body.instagramAtivo === 'on';
    redesSociais.whatsapp = req.body.whatsapp || '';
    redesSociais.whatsappAtivo = req.body.whatsappAtivo === 'on';
    redesSociais.grupoWhatsapp = req.body.grupoWhatsapp || '';
    redesSociais.grupoAtivo = req.body.grupoAtivo === 'on';
    fs.writeFileSync('./redes.json', JSON.stringify(redesSociais, null, 2));
    res.send('<script>alert("Configurações salvas!"); window.location.href="/admin/config-pix";</script>');
});

app.post('/admin/criar-rifa', upload.single('imagem'), (req, res) => {
    const { titulo, descricao, modalidade, preco, dataEncerramento, tipo_pix, chave_pix, whatsapp_suporte, premio_manual } = req.body;
    const imagem = req.file ? '/uploads/' + req.file.filename : '/uploads/default.jpg';
    db.run(`INSERT INTO rifas (titulo, descricao, modalidade, preco, dataEncerramento, imagem, tipo_pix, chave_pix, whatsapp_suporte, premio_manual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [titulo, descricao, modalidade, preco, dataEncerramento, imagem, tipo_pix, chave_pix, whatsapp_suporte, premio_manual]);
    const stmt = db.prepare("SELECT last_insert_rowid() as id");
    stmt.step();
    const rifaId = stmt.getAsObject().id;
    stmt.free();

    let qtd = 100;
    if (modalidade === 'grupo') qtd = 25;
    if (modalidade === 'centena') qtd = 1000;
    if (modalidade === 'milhar') qtd = 10000;

    for (let i = 0; i < qtd; i++) {
        let num = String(i);
        if (modalidade === 'grupo') num = String(i + 1).padStart(2, '0');
        if (modalidade === 'dezena') num = String(i).padStart(2, '0');
        if (modalidade === 'centena') num = String(i).padStart(3, '0');
        if (modalidade === 'milhar') num = String(i).padStart(4, '0');
        db.run(`INSERT INTO bilhetes (rifa_id, numero, status) VALUES (?, ?, 'livre')`, [rifaId, num]);
    }
    salvarDB();
    res.redirect('/admin');
});

app.get('/admin/status/:id', (req, res) => {
    db.run(`UPDATE rifas SET ativa = CASE WHEN ativa = 1 THEN 0 ELSE 1 END WHERE id = ?`, [req.params.id]);
    salvarDB();
    res.redirect('/admin');
});

app.get('/admin/excluir/:id', (req, res) => {
    db.run(`DELETE FROM bilhetes WHERE rifa_id = ?`, [req.params.id]);
    db.run(`DELETE FROM rifas WHERE id = ?`, [req.params.id]);
    salvarDB();
    res.redirect('/admin');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
