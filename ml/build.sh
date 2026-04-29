#!/bin/bash
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing pystan (prophet dependency)..."
pip install pystan==3.4.0

echo "==> Installing prophet..."
pip install prophet==1.1.5

echo "==> Installing all ML requirements..."
pip install -r requirements.txt

echo "==> Build complete!"
