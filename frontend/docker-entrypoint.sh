#!/bin/sh

# Remplacer les variables d'environnement dans env.js
echo "window.env = {" > /usr/share/nginx/html/env.js
echo "  API_URL: '${VITE_API_URL}'," >> /usr/share/nginx/html/env.js
echo "};" >> /usr/share/nginx/html/env.js

exec "$@" 