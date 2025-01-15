#!/bin/bash

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo "Erreur: Le fichier .env n'existe pas"
    exit 1
fi

# Créer un fichier temporaire pour stocker les données encodées en base64
TEMP_FILE=$(mktemp)

# Lire le fichier .env et encoder chaque ligne en base64
while IFS= read -r line || [[ -n "$line" ]]; do
    # Ignorer les lignes vides et les commentaires
    if [[ ! "$line" =~ ^[[:space:]]*# && -n "$line" ]]; then
        # Extraire la clé et la valeur
        key=$(echo "$line" | cut -d'=' -f1)
        value=$(echo "$line" | cut -d'=' -f2-)
        
        # Nettoyer les guillemets, espaces et espaces de fin de ligne
        key=$(echo "$key" | tr -d ' ')
        value=$(echo "$value" | tr -d '"' | tr -d "'" | tr -d ' ' | tr -d '\r')
        
        # Encoder en base64 et stocker dans le fichier temporaire
        echo "  $key: $(echo -n "$value" | base64 | tr -d ' ')" >> "$TEMP_FILE"
    fi
done < .env

# Générer le secret Kubernetes
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: weekly-ingestor-env
  namespace: weekly-ingestor
type: Opaque
data:
$(cat "$TEMP_FILE")
EOF

# Supprimer le fichier temporaire
rm "$TEMP_FILE"

echo "Secret 'weekly-ingestor-env' créé avec succès dans le namespace 'weekly-ingestor'" 