const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Sistema de Rifas - GS Premiações</title>
      <style>
        body { background: #171a21; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #1bb581; }
        .btn { display: inline-block; background: #400b47; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Sistema de Rifas Online - GS Premiações</h1>
      <p>O site está rodando com sucesso!</p>
      <a href="/admin" class="btn">Painel Administrativo</a>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
