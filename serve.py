"""Local preview server for editing.

Plain `python -m http.server` sends no Cache-Control, so browsers guess and
happily serve a stale styles.css after you've edited it. This one tells the
browser never to cache, so a normal refresh always shows your latest changes.

    python serve.py          # http://127.0.0.1:5177
    python serve.py 8080     # pick another port
"""

import http.server
import mimetypes
import sys

# Windows often has no .webp registration, so Python guesses
# application/octet-stream and strict browsers refuse to render the icons.
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5177


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".css": "text/css",
        ".js": "application/javascript",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        print("Serving http://127.0.0.1:%d  (Ctrl+C to stop)" % PORT)
        httpd.serve_forever()
