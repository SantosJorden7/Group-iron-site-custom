FROM node:16-alpine as build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all client files
COPY . .

# Build the React app with optimizations
RUN npm run build

# Production environment
FROM nginx:alpine

# Copy custom nginx config for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create cache directories for wiki and wiseoldman data
RUN mkdir -p /usr/share/nginx/html/cache/wiki
RUN mkdir -p /usr/share/nginx/html/cache/wom

# Expose port 4000
EXPOSE 4000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
