"""
Servidor de teste do site, para abrir no computador, no tablet e no celular.

Igual ao "python -m http.server", mas manda o navegador NÃO guardar cópia dos
arquivos (Cache-Control: no-store). Assim toda atualização aparece só de recarregar
a página, inclusive no celular, onde não tem Ctrl + F5.

Uso (na pasta do site):
    python ferramentas\\servidor.py          -> porta 8080
    python ferramentas\\servidor.py 8090     -> outra porta
"""
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PASTA_SITE = Path(__file__).resolve().parent.parent
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class SemCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):  # terminal limpo
        pass


def ip_da_rede():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "IP-DESTE-COMPUTADOR"


if __name__ == "__main__":
    SemCache.extensions_map[".js"] = "text/javascript"
    SemCache.extensions_map[".webmanifest"] = "application/manifest+json"
    servidor = ThreadingHTTPServer(("0.0.0.0", PORTA), partial(SemCache, directory=str(PASTA_SITE)))
    print("Site no ar (sem cache):")
    print(f"  neste computador:     http://localhost:{PORTA}")
    print(f"  tablet e celular:     http://{ip_da_rede()}:{PORTA}   (mesmo Wi-Fi)")
    print("Para parar: Ctrl + C")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado.")
