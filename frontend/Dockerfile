FROM node:lts-slim AS builder
WORKDIR /app

# Configurer Yarn pour utiliser node_modules classique dans Docker
COPY package.json yarn.lock ./
RUN echo "nodeLinker: node-modules" >> .yarnrc.yml

# Installer avec Yarn mais en mode node_modules
RUN corepack enable && \
    corepack prepare yarn@4.6.0 --activate && \
    yarn install

COPY . .
RUN yarn build

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

FROM nginx:alpine-slim AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
CMD ["nginx", "-g", "daemon off;"]

FROM node:lts-slim AS development
WORKDIR /app
COPY package.json yarn.lock ./
RUN echo "nodeLinker: node-modules" >> .yarnrc.yml
# Installer avec Yarn mais en mode node_modules
RUN corepack enable && \
    corepack prepare yarn@4.6.0 --activate && \
    yarn install
COPY . .
EXPOSE 5173
CMD ["yarn", "run", "dev", "--", "--host", "0.0.0.0"]

FROM production AS final 