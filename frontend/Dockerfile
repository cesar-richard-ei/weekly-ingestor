FROM node:lts-slim AS builder
WORKDIR /app

# En mode dev, on monte les volumes donc pas besoin de copier
# En mode prod, on copie tout
COPY package*.json tsconfig*.json vite.config.ts ./
RUN npm install --include=dev

# Si ARG BUILD_MODE=production (par défaut)
ARG BUILD_MODE=production
COPY . .
RUN if [ "$BUILD_MODE" = "production" ]; then \
      mkdir -p public && echo "window.env = {};" > public/env.js && \
      npm run build; \
    fi

# Multi-stage build pour la production uniquement
FROM nginx:alpine-slim AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Fix permissions
RUN chmod +x /docker-entrypoint.sh && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

USER nginx

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# Stage de développement
FROM builder AS development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Sélection du stage final en fonction du mode
FROM production AS final 