# build stage
FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Overridable at build time (e.g. isolated e2e stacks pointing at a different
# API host/port); defaults to the value baked in .env.production.
ARG VITE_API_BASE_URL=http://localhost:5001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# production stage
# nginx-unprivileged, not plain nginx: it's pre-configured to run as a
# non-root user out of the box (writable paths, PID file location, etc. all
# already adjusted) - the trade-off is it listens on 8080, not 80, since a
# non-root user can't bind a privileged port. Host-side port mappings
# (docker-compose.yml / docker-compose.e2e.yml) publish that back to the
# usual 80/8085, so this is transparent to anyone hitting the app.
FROM nginxinc/nginx-unprivileged:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]