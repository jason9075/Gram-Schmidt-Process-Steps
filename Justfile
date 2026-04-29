set shell := ["sh", "-c"]

default:
    @just --list

dev:
    @echo "\033[36m[Nord] Running gfx-lab dev server...\033[0m"
    live-server --port 8080 .

refresh:
    @echo "\033[34m[Nord] Triggering workspace refresh...\033[0m"
    touch index.html

check:
    @live-server --version 2>&1 || true
    @just --version
