# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY package*.json ./

RUN npm ci

# Copy application source
COPY . .

# Generate the production build
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine

# Remove the default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite's production output
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]