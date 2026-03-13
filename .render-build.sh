#!/bin/bash
# Render build script for Tourism Chatbot

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p backend
mkdir -p frontend

# Log successful build
echo "Build process completed successfully"
