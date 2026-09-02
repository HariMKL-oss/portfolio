# Use lightweight Node.js base image with Debian
FROM node:20-slim

# Install TeX Live and essential LaTeX resume packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-latex-extra \
    lmodern \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 5050
ENV PORT=5050
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
