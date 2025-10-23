#!/bin/bash

echo "🚀 Starting Authorio Development Environment..."
echo ""
echo "Building Electron files..."
npm run build:electron

echo ""
echo "Starting Vite dev server and Electron..."
echo "The app will open automatically once Vite is ready."
echo ""

# Set development environment
export NODE_ENV=development

# Start both vite and electron
npm run dev



