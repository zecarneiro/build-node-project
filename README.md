# build-node-projects
**DESCRIPTION**

Build node projects

## Dependencies
Run:
```
> npm i --save-dev yargs fs-extra webpack webpack-cli ts-loader
```

**IMPORTANT:**
- In case error, please run `npm install -g npm@latest`
- To Skip ES module error: downgrade `chalk` package to `4.1.2`

---
## Usage

On `package.json` file:

```json
{
  ...
  "scripts": {
    "build": "node ./path/to/build/build.js build-ts ./tsconfig.json --lint-fix src"
  },
  ...
}
```

For **help** execute: `node ./path/to/build/build.js --help`
