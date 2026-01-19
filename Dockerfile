FROM node:24-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create tiles directory
RUN mkdir -p /app/tiles

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "run", "dev"]
