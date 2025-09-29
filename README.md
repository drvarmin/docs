# Superwall Docs

## Run Locally
First time you run the docs, you'll need to build the docs first
```
yarn build
```

Then can just run the dev server
```
yarn dev
```

will run the docs at http://localhost:8293

Note that some changes need to re-run build/dev to take effect, like redirects or remarks

### Run AI Search
```
cd ../docs-ai-api
yarn dev
```

## Deploy
### Deploy Production
```
yarn deploy
```

### Deploy Staging
```
yarn deploy:staging
```
