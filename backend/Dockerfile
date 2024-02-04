# Use an official Node runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Install ffmpeg and GraphicsMagick
RUN apt-get update && \
    apt-get install -y ffmpeg graphicsmagick && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json to use cached layers when possible
COPY package*.json ./

# Copy drizzle config
COPY drizzle.config.ts ./drizzle.config.ts

# Copy SWC config
COPY .swcrc ./.swcrc

# Install project dependencies
RUN npm install

# Copy over the necessary directories
COPY ./src ./src
COPY ./assets ./assets
COPY ./drizzle ./drizzle
# Note: /dist, /download, and /cache are excluded via .dockerignore and volume mappings

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable for persistent storage paths
ENV CACHE_FOLDER=/data/cache
ENV DOWNLOAD_FOLDER=/data/download

# Volumes for external mapping
VOLUME ["/data/cache", "/data/download"]

# Run the app
CMD ["npm", "run", "start"] # Assuming your entry point is compiled to /dist