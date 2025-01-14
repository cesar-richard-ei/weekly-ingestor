#!/bin/sh

# Créer env.js dans /tmp d'abord
echo "window.env = {" > /tmp/env.js
echo "  API_URL: '${VITE_API_URL}'," >> /tmp/env.js
echo "};" >> /tmp/env.js

# Copier le fichier vers la destination finale
cp /tmp/env.js /usr/share/nginx/html/env.js

exec "$@" 