FROM node:lts-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.6.0 --activate
COPY package.json .yarn yarn.lock ./
RUN yarn install --immutable

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN yarn build

FROM nginx:alpine-slim AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
CMD ["nginx", "-g", "daemon off;"]

FROM node:lts-slim AS development
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.6.0 --activate
COPY package.json .yarn yarn.lock ./
RUN yarn install --immutable
COPY . .
EXPOSE 5173
CMD ["yarn", "run", "dev", "--", "--host", "0.0.0.0"]

FROM production AS final 