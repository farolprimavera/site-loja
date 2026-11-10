# Site Farol da Primavera

Site da loja em HTML, CSS e JavaScript puros, publicado no GitHub Pages.

## Atualização diária dos produtos

1. Exporte do sistema e salve em `ferramentas/entrada/` **sempre com estes nomes**:
   - `produtos.csv` — cadastro exportado do Marketplace
   - `precos.pdf` — relatório *Tabelas de Preço*, filtro **Depósito = MATRIZ**, só ativos
   - `vista-ret.xls` e `prazo-ret.xls` — tabelas de retirada (cimentícios)
   - `cadastro.xlsx` — cadastro do Automec (unidade e caminho da foto)
2. Rode o script:
   ```
   python ferramentas/atualizar_site.py
   ```
3. Confira `ferramentas/relatorio.txt` (o que ficou de fora e por quê).
4. Faça o commit e o push.

O script gera `dados/catalogo.json` e `dados/detalhes/*.json`.
A pasta `ferramentas/entrada/` está no `.gitignore`: as planilhas do sistema nunca são publicadas.

### Regras aplicadas
- Só entra produto ativo, com estoque da matriz > 0 e preço à vista.
- Super Oferta só vale se for menor que o à vista (e no site: só à vista e retirando na loja).
- Pisos: m² por caixa, peças, PEI e junta são lidos da descrição do Marketplace.
- `ferramentas/excluir.txt`: códigos que nunca devem aparecer (produtos de teste etc.).

### Primeira vez no computador
```
pip install -r ferramentas/requirements.txt
```

## Testar o site no computador
O site usa módulos JavaScript, então não abre clicando duas vezes no HTML. Rode um servidor local:
```
cd C:\Users\farol.adm\Documents\David\site-loja
python -m http.server 8000
```
e abra http://localhost:8000 no navegador.

## Estrutura
```
index.html, produtos.html, ofertas.html, produto.html,
carrinho.html, contato.html, sobre.html, 404.html
styles/          base (cores e temas), layout (cabeçalho, menu, rodapé), componentes, paginas/
script/          app.js (roda em todas as páginas) + módulos compartilhados
script/paginas/  um módulo por página
dados/           catalogo.json, detalhes/, fretes.json (bairros e fretes)
imagens/         marca/, banners/, loja/, produtos/ (gerada pelo script), favicon/
ferramentas/     script de atualização
```

### Onde mudar o quê
- Banners do carrossel: `imagens/banners/` e o bloco `carrossel` em `index.html`.
- Bairros e fretes: `dados/fretes.json` (`[nome, valor]`, ou `[nome, valor, "c"]` para ponto crítico).
- WhatsApp do televendas: `NUMERO` em `script/whatsapp.js`.
- Cores: variáveis no topo de `styles/base.css`.
