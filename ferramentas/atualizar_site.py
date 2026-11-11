"""
atualizar_site.py — gera os dados do site da Farol da Primavera.

O QUE ELE FAZ
  1. Lê o cadastro exportado do Marketplace  (entrada/produtos.csv)
  2. Lê o relatório "Tabelas de Preço" do sistema, depósito MATRIZ
     (entrada/precos.pdf  — ou precos.xlsx / precos.csv, se um dia exportar assim)
  3. Junta os dois pelo código do produto
  4. Aplica as regras do site
  5. Grava:
       dados/catalogo.json        -> lista leve de todos os produtos (vitrine, busca, carrinho)
       dados/detalhes/NN.json     -> descrição e ficha técnica, em 100 pedaços
                                     (a página do produto só baixa o pedaço dela)
       ferramentas/relatorio.txt  -> o que ficou de fora e por quê

REGRAS DO SITE
  - Só entra produto ATIVO, com estoque da MATRIZ maior que zero e com preço à vista.
  - Super Oferta só vale se for MENOR que o preço à vista.
  - Códigos em ferramentas/excluir.txt nunca entram (produtos de teste etc.).
  - ferramentas/fotos_trocadas.txt troca a foto de um produto quando a do cadastro está errada.
  - Pisos: m² por caixa, peças, PEI e junta são lidos da descrição.
  - NADA de custo, fornecedor ou quantidade exata vai para o site:
    só as colunas da lista CAMPOS_PERMITIDOS chegam no JSON.

COMO USAR
  python ferramentas/atualizar_site.py
"""

import json
import os
import warnings
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd

warnings.filterwarnings("ignore", message=".*xlrd.*")  # aviso de que o formato .xls é antigo: não atrapalha

# ---------------------------------------------------------------- caminhos
PASTA_FERRAMENTAS = Path(__file__).resolve().parent
PASTA_SITE = PASTA_FERRAMENTAS.parent
ENTRADA = PASTA_FERRAMENTAS / "entrada"
DADOS = PASTA_SITE / "dados"
FOTOS = PASTA_SITE / "imagens" / "produtos"

# Única lista de campos que pode sair no catálogo. Se não está aqui, não vai para a internet.
CAMPOS_PERMITIDOS = {
    "cod", "ean", "nome", "marca", "grupo", "sub", "vista", "prazo", "vistaRet", "prazoRet",
    "super", "bf", "un", "fator", "foto", "status",
}

# Black Friday: preço de entrada/black.xls (Código e Preço), à vista ou 3x sem juros, só retirando na loja.
# Depois desta data o site esconde a campanha sozinho, e o script ignora o black.xls.
BLACK_FRIDAY_FIM = "2026-11-30"

# Nome que o cliente vê para cada grupo do sistema (o sistema não usa acento).
# "PISOS REVESTIMENTO" é um grupo duplicado no cadastro: juntamos com "PISOS E REVESTIMENTOS".
# grupos do sistema que não vão para o site (uso interno, serviços, corantes da máquina)
GRUPOS_FORA = {"CONSUMO", "SERVIÇOS", "SERVICOS", "TINTOMETRICO", "TINTOMÉTRICO"}

GRUPOS = {
    "BASICO": "Básico", "HIDRAULICO": "Hidráulico", "ELETRICO": "Elétrico", "FERRAGEM": "Ferragens",
    "FERRAMENTA": "Ferramentas", "PINTURA": "Pintura", "ACABAMENTO": "Acabamento",
    "PISOS E REVESTIMENTOS": "Pisos e Revestimentos", "PISOS REVESTIMENTO": "Pisos e Revestimentos",
    "FAIXAS/FILETES/RODAPÉS": "Faixas, Filetes e Rodapés", "FAIXAS/FILETES/RODAPES": "Faixas, Filetes e Rodapés", "LIMPEZA": "Limpeza", "CONSUMO": "Consumo",
    "TINTOMETRICO": "Tintométrico", "SERVIÇOS": "Serviços",
}

PALAVRAS_MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "com", "para", "p/", "c/", "s/"}

avisos = []  # tudo que der errado vai para o relatório


def aviso(texto):
    avisos.append(texto)


# ---------------------------------------------------------------- utilidades
def numero_br(texto):
    """'R$1.234,56' -> 1234.56 ;  '' -> None"""
    if texto is None:
        return None
    t = str(texto).replace("R$", "").strip()
    if not t or t.lower() == "nan":
        return None
    if "," in t:                      # formato brasileiro
        t = t.replace(".", "").replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def titulo(texto):
    """'1/4 CERAMICA EMBELEZA CORAL' -> '1/4 Ceramica Embeleza Coral'"""
    palavras = []
    for i, p in enumerate(str(texto).strip().split()):
        baixa = p.lower()
        if i > 0 and baixa in PALAVRAS_MINUSCULAS:
            palavras.append(baixa)
        elif re.search(r"\d", p):     # medidas e códigos ficam como estão: 60X60, 50KG, CPII
            palavras.append(p)
        else:
            palavras.append(baixa[:1].upper() + baixa[1:])
    return " ".join(palavras)


def sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


# ---------------------------------------------------------------- 1. cadastro (Marketplace)
def ler_cadastro():
    arq = ENTRADA / "produtos.csv"
    if not arq.exists():
        sys.exit(f"ERRO: não achei {arq}. Exporte o cadastro do Marketplace com esse nome.")
    df = pd.read_csv(arq, sep=";", dtype=str, encoding="utf-8-sig").fillna("")
    obrigatorias = {"SKU", "Nome", "Marca", "Informacoes do produto", "Categoria", "Ativo", "EAN", "Peso"}
    faltando = obrigatorias - set(df.columns)
    if faltando:
        sys.exit(f"ERRO: o produtos.csv está sem as colunas: {', '.join(sorted(faltando))}")
    df["SKU"] = df["SKU"].str.strip()
    print(f"  cadastro: {len(df)} produtos")
    return df


# ---------------------------------------------------------------- 2. preços e estoque da matriz
def ler_precos():
    """Devolve (tabela, data_hora). Tabela: cod, qtd, vista, prazo, super."""
    for nome in ("precos.xlsx", "precos.xls", "precos.csv"):
        arq = ENTRADA / nome
        if arq.exists():
            return ler_precos_planilha(arq), datetime.fromtimestamp(arq.stat().st_mtime)
    arq = ENTRADA / "precos.pdf"
    if arq.exists():
        return ler_precos_pdf(arq)
    sys.exit("ERRO: não achei entrada/precos.pdf (nem .xlsx/.csv).")


def ler_precos_planilha(arq):
    """Mesmo relatório, se um dia sair em Excel/CSV: CdProd | Quant. | A VISTA | A PRAZO | SUP.OFERTA"""
    if arq.suffix == ".csv":
        df = pd.read_csv(arq, sep=";", dtype=str, encoding="utf-8-sig")
    else:
        df = pd.read_excel(arq, dtype=str)
    df = df.rename(columns=lambda c: str(c).strip().upper())
    tabela = pd.DataFrame({
        "cod": df["CDPROD"].astype(str).str.strip(),
        "qtd": df["QUANT."].map(numero_br),
        "vista": df["A VISTA"].map(numero_br),
        "prazo": df["A PRAZO"].map(numero_br),
        "super": df.get("SUP.OFERTA", pd.Series(dtype=str)).map(numero_br),
    })
    print(f"  preços: {len(tabela)} linhas ({arq.name})")
    return tabela


def ler_precos_pdf(arq):
    """
    Lê o PDF 'TABELAS DE PREÇO' pela posição horizontal de cada palavra:
      código ~ x<45 | quantidade ~ x 340-405 | à vista 405-470 | a prazo 470-530 | super oferta >530
    Nomes compridos quebram em várias linhas: o código abre o produto e os números
    das linhas seguintes pertencem a ele.
    """
    import pdfplumber

    colunas = {"vista": (405, 470), "prazo": (470, 530), "super": (530, 800)}
    linhas_saida, data_hora = [], None

    with pdfplumber.open(arq) as pdf:
        texto_p1 = pdf.pages[0].extract_text() or ""
        m = re.search(r"Data:\s*(\d{2}/\d{2}/\d{4}).*?Hora:\s*(\d{2}:\d{2})", texto_p1, re.S)
        if m:
            data_hora = datetime.strptime(m.group(1) + " " + m.group(2), "%d/%m/%Y %H:%M")
        if "MATRIZ" not in texto_p1.upper():
            aviso("ATENÇÃO: o PDF não diz 'Deposito = MATRIZ' no cabeçalho. Confira o filtro do relatório.")

        for n, pagina in enumerate(pdf.pages, 1):
            palavras = pagina.extract_words()
            cab = [w for w in palavras if w["text"] == "CdProd"]
            if not cab:
                continue
            topo = cab[0]["top"] + 5
            por_linha, digitos = {}, {}
            for w in palavras:
                if w["top"] > topo:
                    por_linha.setdefault(round(w["top"]), []).append(w)
            # quando o fabricante fica por cima da quantidade, os números vêm grudados nas letras:
            # pegamos os dígitos um a um, pela posição
            for c in pagina.chars:
                if c["top"] > topo and 352 < c["x0"] < 405 and re.fullmatch(r"[-\d]", c["text"]):
                    digitos.setdefault(round(c["top"]), []).append(c)

            for y in sorted(set(por_linha) | set(digitos)):
                L = por_linha.get(y, [])
                cod = [w for w in L if w["x0"] < 45 and re.fullmatch(r"\d+", w["text"])]
                qtd = [w["text"] for w in L if 340 < w["x0"] < 405 and re.fullmatch(r"-?\d+", w["text"])]
                if not qtd and y in digitos:
                    qtd = ["".join(c["text"] for c in sorted(digitos[y], key=lambda c: c["x0"]))]
                precos = {k: [w for w in L if a <= w["x0"] < b and w["text"].startswith("R$")]
                          for k, (a, b) in colunas.items()}
                if cod:
                    linhas_saida.append({"cod": cod[0]["text"], "pagina": n})
                if linhas_saida and (qtd or any(precos.values())):
                    atual = linhas_saida[-1]
                    if qtd and "qtd" not in atual:
                        atual["qtd"] = numero_br(qtd[0])
                    for k, v in precos.items():
                        if v and k not in atual:
                            atual[k] = numero_br(v[0]["text"])

    tabela = pd.DataFrame(linhas_saida)
    for c in ("qtd", "vista", "prazo", "super"):
        if c not in tabela:
            tabela[c] = None
    sem_qtd = tabela["qtd"].isna().sum()
    if sem_qtd:
        aviso(f"{sem_qtd} linhas do PDF ficaram sem quantidade (leitura do PDF) e saíram do site.")
    print(f"  preços: {len(tabela)} linhas lidas do PDF ({arq.name})")
    return tabela, data_hora or datetime.now()


# ---------------------------------------------------------------- 2a. tabelas RET (retirando na loja)
def ler_ret(nome):
    """
    entrada/vista-ret.xls e entrada/prazo-ret.xls: exportação 'Produto' do Automec filtrada
    pela tabela RET. Só lemos Código e Preço. Produto que não está na lista = não tem preço RET.
    """
    arq = next((ENTRADA / f"{nome}.{ext}" for ext in ("xls", "xlsx", "csv") if (ENTRADA / f"{nome}.{ext}").exists()), None)
    if not arq:
        return {}
    if arq.suffix == ".csv":
        df = pd.read_csv(arq, sep=";", dtype=str, encoding="utf-8-sig", usecols=["Código", "Preço"])
    else:
        extra = {"engine_kwargs": {"logfile": open(os.devnull, "w")}} if arq.suffix == ".xls" else {}
        df = pd.read_excel(arq, dtype=str, usecols=["Código", "Preço"], **extra)
    precos = {}
    for _, r in df.fillna("").iterrows():
        valor = numero_br(r["Preço"])
        if valor:
            precos[re.sub(r"\.0$", "", r["Código"].strip())] = valor
    print(f"  {nome}: {len(precos)} produtos")
    return precos


# ---------------------------------------------------------------- 2c. Black Friday
def ler_black(hoje):
    """entrada/black.xls: exportação 'Produto' do Automec com o preço da Black Friday. Só lemos Código e Preço."""
    if hoje.strftime("%Y-%m-%d") > BLACK_FRIDAY_FIM:
        if any((ENTRADA / f"black.{e}").exists() for e in ("xls", "xlsx", "csv")):
            aviso(f"Black Friday terminou em {BLACK_FRIDAY_FIM}: black.xls ignorado (pode apagar)")
        return {}
    precos = ler_ret("black")
    return precos


# ---------------------------------------------------------------- 2b. cadastro do Automec (unidade e foto)
# Unidade do sistema -> como o cliente lê no site
UNIDADES = {
    "UN": "un", "M2": "m²", "SC": "saco", "RL": "rolo", "GL": "galão", "CTL": "cartela", "MT": "metro",
    "JG": "jogo", "PAR": "par", "PCT": "pacote", "KG": "kg", "MTF": "metro", "LT": "lata", "CX": "caixa",
    "BD": "balde", "TB": "tubo", "PC": "peça", "M3": "m³", "L": "litro", "CJ": "conjunto",
}


def ler_automec():
    """
    Exportação 'Produto' do Automec (entrada/cadastro.xlsx). Colunas lidas:
    Código, Produto, Grupo, Sub-grupo, Unid. Estoque, Caminho foto, Código de Barras, Observação e Fabricante.
    Custo, Fornecedor e Qtde. NUNCA são lidos (o estoque vem do relatório de preços, só da matriz).
    Serve para a unidade e a foto de todos, e como cadastro dos produtos que não estão no Marketplace.
    """
    arq = next((ENTRADA / n for n in ("cadastro.xlsx", "cadastro.xls") if (ENTRADA / n).exists()), None)
    if not arq:
        aviso("entrada/cadastro.xlsx não encontrado: produtos sem unidade, sem foto e só os do Marketplace.")
        return {}
    colunas = ["Código", "Produto", "Grupo", "Sub-grupo", "Unid. Estoque", "Caminho foto",
               "Código de Barras", "Observação", "Fabricante"]
    existentes = pd.read_excel(arq, nrows=0).columns
    df = pd.read_excel(arq, dtype=str, usecols=[c for c in colunas if c in existentes]).fillna("")
    dados = {}
    for _, r in df.iterrows():
        cod = re.sub(r"\.0$", "", r["Código"].strip())
        foto = re.split(r"[\\/]", r["Caminho foto"].strip())[-1]   # só o nome do arquivo
        dados[cod] = {
            "un": r["Unid. Estoque"].strip().upper(), "foto": foto,
            "nome": r.get("Produto", "").strip(), "grupo": r.get("Grupo", "").strip(),
            "sub": r.get("Sub-grupo", "").strip(), "ean": re.sub(r"\.0$", "", r.get("Código de Barras", "").strip()),
            "obs": r.get("Observação", "").replace("_x000D_", "").strip(), "marca": r.get("Fabricante", "").strip(),
        }
    print(f"  cadastro Automec: {len(dados)} produtos ({arq.name})")
    return dados


# ---------------------------------------------------------------- 2d. vendas (Curva ABC)
VENDA_NUMEROS = re.compile(r"^([A-Z0-9²/]{1,5}) (-?[\d.]*,?\d+) (-?[\d.]+,\d{2}) ")


def ler_vendas():
    """
    entrada/vendas.pdf: relatório Curva ABC do Pontual (período: desde janeiro).
    Só lemos o código e a Qtd. Vendida. Custo, lucratividade e o resto NUNCA são lidos.
    Devolve ({código: quantidade vendida}, texto do período) ou (None, "") se o arquivo não existir.
    """
    arq = ENTRADA / "vendas.pdf"
    if not arq.exists():
        aviso("entrada/vendas.pdf não encontrado: produtos sem estoque ficam fora do site (sem aviso de esgotado).")
        return None, ""
    import pdfplumber
    vendas, periodo, atual, esperando = {}, "", None, False
    with pdfplumber.open(arq) as pdf:
        for pagina in pdf.pages:
            for linha in (pagina.extract_text() or "").splitlines():
                linha = linha.strip()
                if not periodo and linha.startswith("Periodo de:"):
                    periodo = re.sub(r"\s+", " ", linha.replace("Periodo de:", "")).replace("a", " a ", 1).strip()
                    periodo = re.sub(r"\s+", " ", periodo)
                if linha.startswith("Grupo.:"):
                    esperando = True
                    continue
                n = VENDA_NUMEROS.match(linha)
                if n and atual:
                    vendas[atual] = vendas.get(atual, 0) + numero_br(n.group(3))
                    atual, esperando = None, True
                    continue
                m = re.match(r"^(\d{1,8}) \S", linha)
                if esperando and m:
                    atual, esperando = m.group(1), False
    print(f"  vendas: {len(vendas)} produtos vendidos ({periodo or arq.name})")
    return vendas, periodo


# ---------------------------------------------------------------- 2c. fotos
class Fotos:
    """
    Procura as fotos em entrada/fotos/ (cópia da pasta \\\\serverdb\\Imagem),
    converte para WebP em dois tamanhos e grava em imagens/produtos/:
        <nome>.webp    800 px  -> página do produto
        <nome>-p.webp  300 px  -> cartões da vitrine
    <nome> é o nome do arquivo original "limpo" (6579_0_20260706092830).
    Foto usada por vários produtos é convertida uma vez só.
    Só converte de novo quando a foto original mudou.
    """
    GRANDE, PEQUENA, QUALIDADE = 800, 300, 78

    def __init__(self):
        # Onde estão as fotos originais: entrada/fotos, ou o caminho escrito em ferramentas/pasta_fotos.txt
        # (ex.: C:\Users\farol.adm\Documents\David\imagens) — assim não precisa copiar de novo.
        cfg = PASTA_FERRAMENTAS / "pasta_fotos.txt"
        self.origem = Path(cfg.read_text(encoding="utf-8").strip()) if cfg.exists() else ENTRADA / "fotos"
        self.indice = {}          # nome em minúsculas -> caminho
        self.por_codigo = {}      # código -> [(n, data, caminho)] das fotos no padrão código_n_data
        if self.origem.exists():
            for f in self.origem.rglob("*"):
                if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                    self.indice[f.name.lower()] = f
                    # padrão do sistema "908_1_20260601120000" ou o curto "908_1" (para pôr foto extra na mão)
                    m = re.match(r"^(\d+)_(\d{1,2})(?:_(\d{14}))?$", f.stem)
                    if m:
                        self.por_codigo.setdefault(m.group(1), []).append((int(m.group(2)), m.group(3) or "0", f))
            print(f"  fotos encontradas: {len(self.indice)}")
        else:
            aviso(f"pasta de fotos não encontrada ({self.origem}): o site fica sem fotos.")
        self.usadas, self.convertidas, self.sem_foto, self.nao_achadas = set(), 0, [], []
        FOTOS.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def nome_limpo(arquivo):
        base = sem_acento(Path(arquivo).stem).lower()
        return re.sub(r"[^a-z0-9_-]+", "-", base).strip("-") or "foto"

    def converter(self, origem):
        from PIL import Image, ImageOps
        nome = self.nome_limpo(origem.name)
        grande, pequena = FOTOS / f"{nome}.webp", FOTOS / f"{nome}-p.webp"
        self.usadas.update({grande.name, pequena.name})
        if grande.exists() and pequena.exists() and grande.stat().st_mtime >= origem.stat().st_mtime:
            return nome                                  # já convertida e sem mudança
        try:
            with Image.open(origem) as im:
                im = ImageOps.exif_transpose(im)           # foto de celular deitada
                if im.mode in ("RGBA", "LA", "P"):        # PNG transparente: fundo branco
                    im = im.convert("RGBA")
                    fundo = Image.new("RGB", im.size, (255, 255, 255))
                    fundo.paste(im, mask=im.split()[-1])
                    im = fundo
                else:
                    im = im.convert("RGB")
                for destino, lado in ((grande, self.GRANDE), (pequena, self.PEQUENA)):
                    copia = im.copy()
                    copia.thumbnail((lado, lado), Image.LANCZOS)
                    copia.save(destino, "WEBP", quality=self.QUALIDADE, method=6)
            self.convertidas += 1
            return nome
        except Exception as erro:
            aviso(f"foto com defeito, ignorada: {origem.name} ({erro})")
            return None

    def preparar(self, cod, arquivo_cadastro, nome_produto, trocadas=None):
        """
        Lista de nomes-base das fotos do produto; a primeira é a principal.
        trocadas: fotos do fotos_trocadas.txt. Quando existem, são as ÚNICAS fotos do produto
        (as do cadastro e as do padrão código_n_data ficam de fora, porque estavam erradas).
        """
        caminhos = []
        for arquivo in (trocadas or [arquivo_cadastro]):
            if not arquivo:
                continue
            achado = self.indice.get(arquivo.lower())
            if achado:
                caminhos.append(achado)
            else:
                self.nao_achadas.append(f"{cod} {nome_produto} -> {arquivo}")
        if trocadas:
            nomes = [n for n in (self.converter(c) for c in caminhos[:6]) if n]
            if not nomes:
                self.sem_foto.append(f"{cod} {nome_produto}")
            return nomes
        # fotos extras no padrão código_1_..., código_2_... (fica a versão mais nova de cada número)
        mais_novas = {}
        for n, data, f in self.por_codigo.get(cod, []):
            if n not in mais_novas or data > mais_novas[n][0]:
                mais_novas[n] = (data, f)
        for n in sorted(mais_novas):
            f = mais_novas[n][1]
            if f not in caminhos:
                caminhos.append(f)
        nomes = [n for n in (self.converter(c) for c in caminhos[:6]) if n]
        if not nomes:
            self.sem_foto.append(f"{cod} {nome_produto}")
        return nomes

    def limpar(self):
        """Apaga do site as fotos de produtos que saíram (não ficam ocupando espaço no GitHub)."""
        apagadas = 0
        for f in FOTOS.glob("*.webp"):
            if f.name not in self.usadas:
                f.unlink()
                apagadas += 1
        total = sum(f.stat().st_size for f in FOTOS.glob("*.webp")) / 1024 / 1024
        return apagadas, total


# ---------------------------------------------------------------- 3. descrição e pisos
RX_FATOR = re.compile(r"(?:CX\.?\s*(?:COM\s*)?|Caixa\s*:?\s*|m2\s*/\s*Caixa\s*:?\s*)(\d+(?:[.,]\d+)?)\s*m", re.I)
RX_PECAS = re.compile(r"(\d+)\s*p[çc]", re.I)
RX_PEI = re.compile(r"PEI\s*[-:]?\s*(\d|L[A-Z])\b", re.I)
RX_JUNTA = re.compile(r"JUNTA\s*:?\s*(\d+(?:[.,]\d+)?)\s*mm", re.I)
RX_QUALIDADE = re.compile(r"^\s*(EXTRA|COMERCIAL|A|B|C)\s*-", re.I)


def linhas_descricao(texto):
    linhas = [l.strip() for l in str(texto).replace("\r", "").split("\n")]
    linhas = [l for l in linhas if l]
    if linhas and re.fullmatch(r"descri[cç][aã]o:?", linhas[0], re.I):
        linhas.pop(0)
    return [re.sub(r";$", ".", l) for l in linhas]


def dados_piso(texto):
    """Lê 'EXTRA - CX 2,01m2 ou 10 pçs - PEI 5 - JUNTA:5mm'"""
    t = str(texto)
    m = RX_FATOR.search(t)
    if not m:
        return {}
    d = {"fator": numero_br(m.group(1))}
    for chave, rx in (("pecas", RX_PECAS), ("pei", RX_PEI), ("junta", RX_JUNTA), ("qualidade", RX_QUALIDADE)):
        achado = rx.search(t)
        if achado:
            d[chave] = achado.group(1).upper() if chave in ("pei", "qualidade") else achado.group(1).replace(".", ",")
    return d


# Pisos: o nome do sistema traz lote e localização na loja. No site o título sai limpo e
# os dois aparecem só na página do produto (ficha técnica).
INICIO_LOTE = re.compile(r"\s*(?:(?<![A-Za-z])(?:LT|LOT)\s*[:(]|(?<![A-Za-z])LT\s+\d|\(\s*\d{1,2}\s*[/\-]\s*\d)", re.I)
LOCAL = re.compile(r"^[A-Za-z]{1,2}\d?(?:\s*[\-/]+\s*[A-Za-z]{0,2}\d?)*$")
PARENTESES = re.compile(r"\(([^()]*)\)")

def separar_lote(nome):
    """'PISO HD 70372 70X70 LT:08/06/24 (E1)' -> ('PISO HD 70372 70X70', '08/06/24', 'E1')"""
    nome = nome.strip()
    m = INICIO_LOTE.search(nome)
    cauda = nome[m.start():] if m else ""
    base = nome[:m.start()] if m else nome
    locais = []
    # localização no fim do nome, mesmo sem lote: "... IVORY PLAIN (E1-E2-G4)"
    while True:
        f = re.search(r"\s*\(([^()]*)\)\s*$", base)
        if not f or not LOCAL.match(f.group(1).strip()):
            break
        locais.insert(0, f.group(1).strip()); base = base[:f.start()]
    for g in PARENTESES.findall(cauda):
        if LOCAL.match(g.strip()):
            locais.append(g.strip())
    sem_local = PARENTESES.sub(lambda g: "" if LOCAL.match(g.group(1).strip()) else g.group(0), cauda)
    # malformado: "LT:25/09/25)(G4)" -> tira o (G4) que sobrou
    sem_local = re.sub(r"\(\s*[A-Za-z]{1,2}\d?(?:[\-/]+[A-Za-z]{0,2}\d?)*\s*\)", "", sem_local)
    lote = re.sub(r"(?i)^\s*(?:LOT|LT)\s*:?", "", sem_local)
    lote = re.sub(r"\s+", " ", lote.replace("(", " ").replace(")", " ")).strip(" :-.")
    return base.strip(" -"), lote, " ".join(locais).upper()


# ---------------------------------------------------------------- 4. juntar e aplicar regras
def montar(cadastro, precos, automec, fotos, ret_vista, ret_prazo, black, vendas, periodo):
    excluir = set()
    arq_excluir = PASTA_FERRAMENTAS / "excluir.txt"
    if arq_excluir.exists():
        for linha in arq_excluir.read_text(encoding="utf-8").splitlines():
            linha = linha.split("#")[0].strip()
            if linha:
                excluir.add(linha)

    # fotos trocadas na mão: ferramentas/fotos_trocadas.txt ("908 = massa-sutil.png"), vale mais que o cadastro
    trocadas = {}
    arq_trocadas = PASTA_FERRAMENTAS / "fotos_trocadas.txt"
    if arq_trocadas.exists():
        for linha in arq_trocadas.read_text(encoding="utf-8").splitlines():
            linha = linha.split("#")[0].strip()
            if "=" in linha:
                cod, arquivos = (x.strip() for x in linha.split("=", 1))
                trocadas[cod] = [a.strip() for a in arquivos.split(",") if a.strip()]

    # produtos que estão no Automec (e no relatório de preços, ou seja, ativos) mas não no Marketplace
    no_marketplace = set(cadastro["SKU"])
    no_relatorio = set(precos["cod"])
    extras = [{"SKU": cod, "Nome": a["nome"], "Marca": a["marca"], "Informacoes do produto": a["obs"],
               "Categoria": f'{a["grupo"]}\\{a["sub"]}', "Ativo": "1", "EAN": a["ean"], "Peso": "", "origem": "automec"}
              for cod, a in automec.items() if cod not in no_marketplace and cod in no_relatorio and a["nome"]]
    if extras:
        cadastro = pd.concat([cadastro.assign(origem="marketplace"), pd.DataFrame(extras)], ignore_index=True)
    else:
        cadastro = cadastro.assign(origem="marketplace")

    base = cadastro.merge(precos, left_on="SKU", right_on="cod", how="left")
    sem_venda = f"sem estoque e sem venda ({periodo or 'no período'})"
    contagem = {"inativo": 0, "sem preço no relatório": 0, "grupo interno (consumo/serviços/tintométrico)": 0,
                "sem estoque na matriz": 0, sem_venda: 0, "sem preço à vista": 0, "na lista de exclusão": 0}
    estatistica = {"esgotado": 0, "automec": 0}
    catalogo, detalhes = [], {}

    for _, r in base.iterrows():
        cod = r["SKU"]
        if cod in excluir:
            contagem["na lista de exclusão"] += 1
            continue
        if r["Ativo"].strip() != "1":
            contagem["inativo"] += 1
            continue
        if pd.isna(r.get("qtd")):
            contagem["sem preço no relatório"] += 1
            continue
        # categoria: a do Automec (mais atual e completa); a do Marketplace só se o Automec não tiver
        a = automec.get(cod, {})
        if a.get("grupo"):
            grupo, sub = a["grupo"].strip(), a.get("sub", "").strip()
        else:
            grupo, _, sub = r["Categoria"].partition("\\")
        if grupo.strip().upper() in GRUPOS_FORA:
            contagem["grupo interno (consumo/serviços/tintométrico)"] += 1
            continue
        # sem estoque na matriz: sobe como ESGOTADO se vendeu no período da Curva ABC; senão fica de fora
        esgotado = r["qtd"] <= 0
        if esgotado and vendas is None:
            contagem["sem estoque na matriz"] += 1
            continue
        if esgotado and not vendas.get(cod):
            contagem[sem_venda] += 1
            continue
        vista, prazo, oferta = r.get("vista"), r.get("prazo"), r.get("super")
        vista = None if pd.isna(vista) else float(vista)
        prazo = None if pd.isna(prazo) else float(prazo)
        oferta = None if pd.isna(oferta) else float(oferta)
        if not vista:
            contagem["sem preço à vista"] += 1
            aviso(f"sem preço à vista (fora do site): {cod} {r['Nome']}")
            continue
        if prazo is None:
            prazo = vista
        if oferta is not None and oferta >= vista:
            aviso(f"Super Oferta ignorada (não é menor que o à vista): {cod} {r['Nome']} — à vista {vista:.2f}, oferta {oferta:.2f}")
            oferta = None

        bf = black.get(cod)
        if bf is not None and bf >= vista:
            aviso(f"Black Friday ignorada (não é menor que o à vista): {cod} {r['Nome']} — à vista {vista:.2f}, black {bf:.2f}")
            bf = None

        marca = r["Marca"].strip()
        desc = r["Informacoes do produto"]
        piso = dados_piso(desc) if grupo.strip().upper().startswith("PISOS") else {}
        if grupo.strip().upper().startswith("PISOS") and not piso:
            aviso(f"piso sem m² por caixa na descrição (vende por unidade): {cod} {r['Nome']}")

        eh_piso = grupo.strip().upper().startswith("PISOS")
        nome_site, lote, local = separar_lote(r["Nome"]) if eh_piso else (r["Nome"], "", "")

        info_automec = automec.get(cod, {})
        fotos_prod = fotos.preparar(cod, info_automec.get("foto", ""), r["Nome"], trocadas.get(cod))
        un = "m²" if piso else UNIDADES.get(info_automec.get("un", ""), None)

        item = {
            "cod": cod,
            "ean": r["EAN"].strip() or None,
            "nome": titulo(nome_site),
            "marca": None if marca.upper() in ("", "DIVERSOS") else titulo(marca),
            "grupo": GRUPOS.get(grupo.strip().upper(), titulo(grupo)) or "Outros",
            "sub": titulo(sub) or "Outros",
            "vista": round(vista, 2),
            "prazo": round(prazo, 2),
            "vistaRet": ret_vista.get(cod) if ret_vista.get(cod, vista) < vista else None,
            "prazoRet": ret_prazo.get(cod) if ret_prazo.get(cod, prazo) < prazo else None,
            "super": round(oferta, 2) if oferta else None,
            "bf": round(bf, 2) if bf else None,
            "un": un,
            "fator": piso.get("fator"),
            "foto": fotos_prod[0] if fotos_prod else None,  # nome-base: o site usa  imagens/produtos/<foto>.webp  e  <foto>-p.webp
            "status": "esgotado" if esgotado else "disponivel",  # sem estoque ideal ainda: não existe "últimas unidades"
        }
        estatistica["esgotado"] += esgotado
        estatistica["automec"] += r["origem"] == "automec"
        if vista < 0.05:
            aviso(f"preço à vista abaixo de R$ 0,05 (confira o cadastro): {cod} {r['Nome']} — R$ {vista:.2f}")
        assert set(item) <= CAMPOS_PERMITIDOS, "campo não permitido no catálogo!"
        catalogo.append({k: v for k, v in item.items() if v is not None})

        peso = numero_br(r["Peso"]) if r["Peso"] else None
        ficha = {k: v for k, v in {
            "peso_kg": round(peso / 1000, 3) if peso else None,
            "pecas_caixa": piso.get("pecas"),
            "pei": piso.get("pei"),
            "junta_mm": piso.get("junta"),
            "qualidade": piso.get("qualidade"),
            "lote": lote or None,
            "local": local or None,
        }.items() if v}
        det = {"descricao": linhas_descricao(desc), "ficha": ficha}
        if len(fotos_prod) > 1:
            det["galeria"] = fotos_prod
        detalhes.setdefault(cod[-2:].zfill(2), {})[cod] = det

    no_site = {p["cod"] for p in catalogo}
    fora = [cod for cod in black if cod not in no_site]
    if fora:
        aviso(f"Black Friday: {len(fora)} códigos da lista não entraram no site (sem estoque na matriz, inativos ou fora do Marketplace): {', '.join(fora)}")
    return catalogo, detalhes, contagem, estatistica


# ---------------------------------------------------------------- 5. gravar
def gravar(catalogo, detalhes, data_hora, contagem, fotos, estatistica):
    DADOS.mkdir(exist_ok=True)
    (DADOS / "detalhes").mkdir(exist_ok=True)

    catalogo.sort(key=lambda p: (p["grupo"], p["sub"], sem_acento(p["nome"])))
    det_de = lambda cod: detalhes.get(cod[-2:].zfill(2), {}).get(cod, {})
    galerias = [(p["cod"], p["nome"], len(det_de(p["cod"])["galeria"]))
                for p in catalogo if det_de(p["cod"]).get("galeria")]
    saida = {
        "atualizado": data_hora.strftime("%Y-%m-%dT%H:%M"),
        "total": len(catalogo),
        **({"blackfriday": {"fim": f"{BLACK_FRIDAY_FIM}T23:59:59-03:00"}} if any("bf" in p for p in catalogo) else {}),
        "produtos": catalogo,
    }
    with open(DADOS / "catalogo.json", "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))

    for antigo in (DADOS / "detalhes").glob("*.json"):
        antigo.unlink()
    for pedaco, itens in detalhes.items():
        with open(DADOS / "detalhes" / f"{pedaco}.json", "w", encoding="utf-8") as f:
            json.dump(itens, f, ensure_ascii=False, separators=(",", ":"))

    tam = (DADOS / "catalogo.json").stat().st_size / 1024
    apagadas, mb_fotos = fotos.limpar()
    resumo = [
        f"Atualização do site — dados de {data_hora:%d/%m/%Y %H:%M}",
        f"Produtos no site: {len(catalogo)}",
        f"  esgotados (sem estoque, mas venderam no período): {estatistica['esgotado']}",
        f"  só no Automec (fora do Marketplace): {estatistica['automec']}",
        f"  Super Oferta: {sum('super' in p for p in catalogo)}",
        f"  Black Friday: {sum('bf' in p for p in catalogo)}",
        f"  com foto: {sum('foto' in p for p in catalogo)}  (convertidas agora: {fotos.convertidas}, removidas: {apagadas})",
        f"  pisos vendidos por caixa: {sum('fator' in p for p in catalogo)}",
        f"catalogo.json: {tam:.0f} KB  ·  fotos no site: {mb_fotos:.0f} MB",
        "",
        "Ficaram de fora:",
        *[f"  {motivo}: {qtd}" for motivo, qtd in contagem.items() if qtd],
        "",
        "Avisos:" if avisos else "Sem avisos.",
        *[f"  - {a}" for a in avisos],
        "",
        f"Produtos com MAIS DE UMA foto ({len(galerias)}) — confira se a 2ª foto é mesmo do produto:",
        *[f"  - {cod} {nome} ({n} fotos)" for cod, nome, n in galerias],
        "",
        f"Produtos do site SEM foto ({len(fotos.sem_foto)}):",
        *[f"  - {x}" for x in fotos.sem_foto],
        "",
        f"Foto cadastrada no Automec mas o arquivo não está em entrada/fotos ({len(fotos.nao_achadas)}):",
        *[f"  - {x}" for x in fotos.nao_achadas],
    ]
    if mb_fotos > 700:
        resumo.insert(8, "  ATENÇÃO: fotos passando de 700 MB — hora de pensar no Cloudflare R2.")
    (PASTA_FERRAMENTAS / "relatorio.txt").write_text("\n".join(resumo), encoding="utf-8")
    print("\n".join(resumo[:11 + sum(1 for q in contagem.values() if q)]))
    print(f"\nsem foto: {len(fotos.sem_foto)}  ·  arquivo de foto não encontrado: {len(fotos.nao_achadas)}")
    print(f"\n{len(avisos)} avisos — detalhes em ferramentas/relatorio.txt")


def main():
    print("Lendo arquivos...")
    cadastro = ler_cadastro()
    precos, data_hora = ler_precos()
    automec = ler_automec()
    ret_vista, ret_prazo = ler_ret("vista-ret"), ler_ret("prazo-ret")
    black = ler_black(datetime.now())
    vendas, periodo = ler_vendas()
    fotos = Fotos()
    print("Montando o catálogo e convertendo fotos novas (a primeira vez demora)...")
    catalogo, detalhes, contagem, estatistica = montar(cadastro, precos, automec, fotos, ret_vista, ret_prazo, black, vendas, periodo)
    gravar(catalogo, detalhes, data_hora, contagem, fotos, estatistica)


if __name__ == "__main__":
    main()
