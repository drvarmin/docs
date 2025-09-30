# Superwall Documentation DevContainer

This devcontainer configuration provides a fully configured development environment for working with the Superwall documentation site in GitHub Codespaces or VS Code Dev Containers.

## Features

- **Node.js 20.18.1** with Corepack enabled
- **Yarn 4.9.1** pre-configured via Corepack
- **Git** and **GitHub CLI** pre-installed
- Automatic dependency installation
- VS Code extensions for MDX, TypeScript, TailwindCSS, and more
- Environment variable template

## Quick Start

### Using GitHub Codespaces

1. Open this repository in GitHub
2. Click "Code" → "Codespaces" → "Create codespace on main"
3. Wait for the container to build (first time takes ~2-3 minutes)
4. The dev server will start automatically
5. Access the documentation at the forwarded port (8293)

### Using VS Code Dev Containers

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this repository in VS Code
3. Press `F1` and select "Dev Containers: Reopen in Container"
4. Wait for the container to build
5. Run `yarn dev` to start the documentation server

## Environment Variables

Copy `.devcontainer/.env.example` to `.env.local` and update with your values:

```bash
cp .devcontainer/.env.example .env.local
```

## Available Commands

- `yarn dev` - Start the development server (port 8293)
- `yarn build` - Build the documentation site
- `yarn deploy:staging` - Deploy to staging environment
- `yarn deploy` - Deploy to production

## Troubleshooting

If you encounter issues:

1. Rebuild the container: "Dev Containers: Rebuild Container"
2. Check the build logs in the VS Code output panel
3. Ensure Docker is running on your local machine (for VS Code)
4. For Codespaces, check the Codespaces logs in the GitHub UI