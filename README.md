# Gram-Schmidt Process Steps

An interactive 3×3 teaching tool for the Gram-Schmidt process and QR decomposition.

## Live Demo

https://jason9075.github.io/Gram-Schmidt-Process-Steps/

## What It Shows

- Input matrix `V`, orthogonal output `U`, orthonormal output `E`, and upper-triangular `R`
- Step-by-step projection, commit, and normalization playback
- QR interpretation with `A = V`, `Q = E`, and `R = Q^T A`
- Three.js views for the input space and orthonormal frame
- Calculation log with cumulative step history

## Local Development

```bash
direnv allow
just dev
```

Then open:

```text
http://localhost:8080
```

If you prefer entering the shell manually:

```bash
nix develop
just dev
```

## Project Structure

```text
.
├── flake.nix
├── Justfile
├── index.html
└── src/
    └── main.js
```
