FROM node:20-alpine AS builder

WORKDIR /app

ARG API_BASE_URL=http://localhost:4000/api

COPY dashboard/package.json ./
RUN npm install

COPY dashboard/ ./
ENV API_BASE_URL=$API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
