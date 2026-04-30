#!/bin/bash
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing binary-only native packages..."
pip install --only-binary=:all: \
    "PyMuPDF==1.24.3" \
    "pandas==2.2.3" \
    "numpy==1.26.4" \
    "scipy==1.13.1"

echo "==> Installing remaining dependencies..."
pip install -r requirements.txt

echo "==> Build complete!"
