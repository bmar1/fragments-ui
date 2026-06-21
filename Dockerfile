# Multi-stage Dockerfile for the Fragments UI (Create React App).
# Stage 1 builds static assets; stage 2 serves them with nginx.
# See: https://docs.docker.com/build/building/multi-stage/

# --- Build stage: compile React app to static files ---
FROM node:24.12.0-alpine AS build

LABEL maintainer="Bilal Umar"
LABEL description="Fragments UI (build stage)"

ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# CRA bakes REACT_APP_* into the bundle at build time
ARG REACT_APP_FRAGMENTS_API_URL=http://localhost:8080
ARG REACT_APP_COGNITO_USER_POOL_ID
ARG REACT_APP_COGNITO_CLIENT_ID
ARG REACT_APP_COGNITO_REDIRECT_URI=http://localhost
ARG REACT_APP_COGNITO_SCOPE=phone openid email
ARG REACT_APP_COGNITO_HOSTED_UI_DOMAIN
ARG REACT_APP_COGNITO_LOGOUT_REDIRECT_URI=http://localhost

ENV REACT_APP_FRAGMENTS_API_URL=$REACT_APP_FRAGMENTS_API_URL
ENV REACT_APP_COGNITO_USER_POOL_ID=$REACT_APP_COGNITO_USER_POOL_ID
ENV REACT_APP_COGNITO_CLIENT_ID=$REACT_APP_COGNITO_CLIENT_ID
ENV REACT_APP_COGNITO_REDIRECT_URI=$REACT_APP_COGNITO_REDIRECT_URI
ENV REACT_APP_COGNITO_SCOPE=$REACT_APP_COGNITO_SCOPE
ENV REACT_APP_COGNITO_HOSTED_UI_DOMAIN=$REACT_APP_COGNITO_HOSTED_UI_DOMAIN
ENV REACT_APP_COGNITO_LOGOUT_REDIRECT_URI=$REACT_APP_COGNITO_LOGOUT_REDIRECT_URI

RUN npm run build

# --- Production stage: nginx serves static files ---
FROM nginx:alpine

LABEL maintainer="Bilal Umar"
LABEL description="Fragments UI static site (nginx)"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
