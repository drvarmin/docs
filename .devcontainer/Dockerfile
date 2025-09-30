ARG VARIANT="20"
FROM mcr.microsoft.com/devcontainers/javascript-node:1-${VARIANT}

RUN corepack enable && \
		npm install -g tsx @anthropic-ai/claude-code
