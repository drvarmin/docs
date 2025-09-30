# Use the official Node.js 20.18.1 image
FROM node:20.18.1-bookworm

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable Corepack for Yarn 4.9.1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare yarn@4.9.1 --activate

# Create workspace directory
RUN mkdir -p /workspace/docs

# Pre-install global tools that might be useful
RUN npm install -g tsx @anthropic-ai/claude-code

# Set the working directory
WORKDIR /workspace/docs

# Set environment variables
ENV NODE_ENV=development
ENV YARN_ENABLE_TELEMETRY=0
ENV YARN_ENABLE_GLOBAL_CACHE=false

# Expose the documentation dev server port
EXPOSE 8293

# Default command (will be overridden by devcontainer.json)
CMD ["bash"]