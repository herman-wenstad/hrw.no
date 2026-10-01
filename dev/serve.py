"""Local preview server with caching disabled, so a reload always shows the latest files.

Usage: python3 dev/serve.py [port]   (default 4300), run from the repo root.
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4300
http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
