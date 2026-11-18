// conteudo.js — banners, fotos da loja, catálogos interativos e redes sociais (dados/conteudo.json)
// O arquivo é editado pelo Painel Integrador, mas também dá para editar à mão.

let promessa = null;

/** O conteúdo do site; se o arquivo faltar ou estiver quebrado, as listas vêm vazias e o site continua. */
export function carregarConteudo() {
  promessa ??= fetch('dados/conteudo.json', { cache: 'no-cache' })
    .then((resp) => (resp.ok ? resp.json() : {}))
    .catch(() => ({}))
    .then((dados) => ({
      banners: dados.banners || [],
      galeria: dados.galeria || [],
      catalogos: dados.catalogos || [],
      redes: dados.redes || [],
    }));
  return promessa;
}
