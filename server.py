#!/usr/bin/env python3
"""
Local HTTP Server for Flappy Bird Neural Network
Supports both http://localhost:8000/ and http://localhost:8000/v1-neural-network/
Zero external dependencies.
"""
import http.server
import socketserver
import os
import sys
import webbrowser
import posixpath
import urllib.parse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class FlappyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        # Normalize and decode URL
        path = path.split('?', 1)[0].split('#', 1)[0]
        path = urllib.parse.unquote(path)

        # Route /v1-neural-network/* to root directory
        prefix = '/v1-neural-network'
        if path == prefix or path == prefix + '/':
            path = '/'
        elif path.startswith(prefix + '/'):
            path = path[len(prefix):]

        # Use standard translation
        words = path.split('/')
        words = [w for w in words if w]
        target_path = DIRECTORY
        for word in words:
            if os.path.dirname(word) or word in (os.curdir, os.pardir):
                continue
            target_path = os.path.join(target_path, word)
        return target_path

    def end_headers(self):
        # Disable caching for local development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), FlappyHandler) as httpd:
        url = f"http://localhost:{PORT}/v1-neural-network/"
        print("=" * 64)
        print("  FLAPPY BIRD NEURAL NETWORK (Neuroevolution)")
        print(f"  Local Server running at:")
        print(f"  --> {url}")
        print(f"  --> http://localhost:{PORT}/")
        print("=" * 64)
        print("Press Ctrl+C to stop the server.")

        # Attempt to open browser automatically
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == '__main__':
    main()
