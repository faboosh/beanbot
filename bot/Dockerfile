# Stage 1: Build the frontend
FROM node:latest as build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
COPY shared/ ../shared/
COPY backend/ ../backend/
RUN npm run build

# Use an official Node runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /app

# Install ffmpeg and GraphicsMagick
RUN apt-get update && \
    apt-get install -y ffmpeg graphicsmagick && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the frontend build
COPY --from=build-frontend /app/frontend/dist /app/public

# Copy package.json and package-lock.json to use cached layers when possible
COPY backend/package*.json ./

# Copy drizzle config
COPY backend/drizzle.config.ts ./drizzle.config.ts

# Copy SWC config
COPY backend/.swcrc ./.swcrc

# Install project dependencies
RUN npm install

# Copy shared files
COPY shared/ ./shared/

# Copy over the necessary directories
COPY backend/src ./src
COPY backend/assets ./assets
COPY backend/drizzle ./drizzle
# Note: /dist, /download, and /cache are excluded via .dockerignore and volume mappings

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable for persistent storage paths
ENV CACHE_FOLDER=/data/cache
ENV DOWNLOAD_FOLDER=/data/download

# Volumes for external mapping
VOLUME ["/data/cache", "/data/download"]

RUN npm run drizzle:migrate

# Run the app
CMD ["npm", "run", "start"] # Assuming your entry point is compiled to /dist