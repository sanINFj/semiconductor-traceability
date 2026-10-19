#!/bin/bash
set -e
export PATH="/home/sanjana066/.nvm/versions/node/v22.23.2/bin:$PATH"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
cd /home/sanjana066/semiconductor-traceability/frontend-react
echo "--- Running Oxlint ---"
npx oxlint
echo "--- Building Vite Production Bundle ---"
npm run build
echo "--- Build Completed Successfully ---"
ls -lh dist
ls -lh dist/assets
