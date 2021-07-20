# @pobidowski/monopack

Highly inspired by https://github.com/flegall/monopack

A JavaScript bundler for node.js monorepo-codebased applications.

This tool comes to fill a gap for node.js developpers who :
 - are building node.js applications (serverless functions, micro-services, monolithic servers or client applications)
 - are using a monorepo codebase.
 - are performing continuous integration/deployment.

Monopack aims to build a **static deterministic deliverable bundle** from your application's entrypoint.

It will build:

 - **a single js** file that bundles all the imported sources from the monorepo.
 - **package.json and yarn.lock** files including only the used third-party dependencies.
 - the **node_modules directory** for these dependencies.

## Usage

### Requirements

 - Node.js >= 10
 - Yarn >= 1.3.2:
   - Yarn is required to be present for installing the produced dependencies.
   - It is not mandatory for your project to use it, but bear in mind that the dependencies collection will be deterministic only if your projet uses Yarn.

### Installation

It can be installed globally and locally

#### Global installation
Using yarn

`yarn global add @pobidowski/monopack`

Or npm

`npm install -g @pobidowski/monopack`

You can then use it with

`$ monopack`

#### Local installation
Using yarn

`yarn add -D @pobidowski/monopack`

Or npm

`npm install --save-dev @pobidowski/monopack`

You can then use it on your project

With yarn

`$ yarn run monopack`

With npm

`./node_modules/.bin/monopack`

### CLI
```
monopack

Options:
      --help       Show help                                           [boolean]
      --version    Show version number                                 [boolean]
  -i, --inputFile  Input file (e.g. src/main.ts)
                                               [string] [default: "src/main.ts"]
  -c, --config     Config file (e.g. monopack.config.js)
                                        [string] [default: "monopack.config.js"]

```

### Default configuration

By default monopack will use typescript 4.3.5 to complie your code into js code that node >= 10 will understand.

Monopack will use webpack 5 to produce the bundle. The bundle is produced in 'production' mode without minimize. Source maps are included.

### Configuration file

The config file can export the following entries :

 - monorepoRootPath: the relative path to the monorepo root.
 - output: the relative or absolute path to the output directory (defaults to a dist directory).
 - modifyWebpackConfig: a function that takes the current configuration and returns the modified configuration.
 - installPackages: a boolean indicating whether packages should be installed after build (default to false).
 - externalModules: an array of extra-module names to bundle (default empty). It can be useful for dynamically required dependencies that monopack cannot detect (e.g.: an sql driver).
   - It expects the package name without the version. (e.g: 'mysql' not 'mysql@2.16.0).
 - modifyPackageJson: a function that takes the produced package json and returns the modified package json object: it can be used to add extra info (engines, version).

#### Example:

```js
const packageJson = require('./package.json');

module.exports = {
  monorepoRootPath: '../../..',
  installPackages: false,
  externalModules: ['mysql2'],
  modifyPackageJson: (pkg) => ({
    ...pkg,
    name: packageJson.name,
    version: packageJson.version,
    private: false,
    license: 'UNLICENSED',
    scripts: {
      sync: 'node sync.js',
      'pm2:prod': `pm2 start ecosystem.config.js --only ${packageJson.name}-prod`,
    },
  }),
};
```

### Dependencies handling
Monopack will collect all used dependencies (dependencies actually imported or required()).

All the dependencies are collected, a package.json with the collected dependencies will be compiled.

Your project's yarn.lock will be copied if it exists. If you are using multiple yarn.lock files, only the top-most one will be copied.