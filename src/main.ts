import path from 'path';
import chalk from 'chalk';
import { Configuration } from 'webpack';
import * as fs from 'fs';
import sortJson from 'sort-json';

// Helpers
import { Logger } from './helpers/Logger';
import { readConfigFile } from './helpers/readConfigFile';
import { build } from './helpers/build';
import { collectMonorepoPackages } from './helpers/collectMonorepoPackages';
import { importMatcher, ImportMatcherTypes } from './helpers/importMatcher';
import {
  collectDependency,
  collectedDependencies,
} from './helpers/collectDependency';
import { findDependencyConflicts } from './helpers/findDependencyConflicts';
import { installExternalPackages } from './helpers/installExternalPackages';
import { convertDependencies } from './helpers/convertDependencies';

// Interfaces
import { MonopackArgsInterface } from './interfaces/MonopackArgsInterface';

export const main = async ({
  configFile,
  inputFile,
}: MonopackArgsInterface) => {
  const workingPath = process.cwd();
  const config = readConfigFile(path.join(workingPath, configFile));

  const inputFullPath = path.join(workingPath, inputFile);
  const outputFullPath = path.join(workingPath, config.output);
  const monorepoRootFullPath = path.join(workingPath, config.monorepoRootPath);
  const outputFile = path.basename(inputFile).replace('.ts', '.js');

  Logger.log(`monopack: Build started`);
  Logger.log(`Monorepo root path: ${chalk.cyan(monorepoRootFullPath)}`);
  Logger.log(`Input file: ${chalk.cyan(inputFullPath)}`);
  Logger.log(`Build output directory: ${chalk.cyan(outputFullPath)}`);
  Logger.log(
    `Install packages after build: ${chalk.cyan(
      config.installPackages ? 'Yes' : 'No',
    )}`,
  );

  const monorepoPackages = [
    ...(await collectMonorepoPackages(
      monorepoRootFullPath,
      'package.json',
      'workspaces',
    )),
    ...(await collectMonorepoPackages(
      monorepoRootFullPath,
      'lerna.json',
      'packages',
    )),
  ];

  Logger.log(
    `Found monorepo packages: ${chalk.cyan(monorepoPackages.join(', '))}`,
  );

  if (config.externalModules.length) {
    config.externalModules.forEach((em) => {
      collectDependency(em, path.dirname(inputFullPath), monorepoRootFullPath);
    });
  }

  let webpackConfig: Configuration = config.modifyWebpackConfig({
    context: monorepoRootFullPath,
    entry: inputFullPath,
    output: {
      path: outputFullPath,
      filename: outputFile,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    target: 'node',
    mode: 'production',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /(node_modules)/,
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              declaration: false,
            },
          },
        },
        {
          test: /\.(html)$/i,
          loader: 'file-loader',
        },
      ],
    },
    externals: [
      (
        { context, request }: { context: string; request: string },
        callback: (a?: null, b?: string) => void,
      ) => {
        const importMatch = importMatcher(
          request,
          context,
          inputFullPath,
          monorepoPackages,
        );

        switch (importMatch.type) {
          case ImportMatcherTypes.INLINE:
            return callback();
          case ImportMatcherTypes.IMPORT:
            if (importMatch.externalDependency) {
              collectDependency(
                importMatch.externalDependency.packageName,
                importMatch.externalDependency.context,
                monorepoRootFullPath,
              );
            }
            return callback(null, `commonjs ${request}`);
        }
      },
    ],
    optimization: {
      minimize: false,
    },
  });

  await build(webpackConfig);

  const conflicts = findDependencyConflicts(collectedDependencies);

  if (conflicts.length) {
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      Logger.error('monopack: Found package conflict:');
      Logger.log(conflict.packageName);

      for (let j = 0; j < conflict.conflict.length; j++) {
        const conflictDetails = conflict.conflict[j];
        Logger.log(
          `${chalk.cyan(conflictDetails.version)} (${conflictDetails.context})`,
        );
      }
    }

    process.exit(0);
  }

  Logger.log('monopack: Build package.json started');

  const packageJson = config.modifyPackageJson({
    name: 'app',
    version: '0.0.1',
    main: outputFile,
    private: true,
    dependencies: sortJson(convertDependencies(collectedDependencies)),
    devDependencies: {},
  });

  fs.writeFileSync(
    path.join(outputFullPath, 'package.json'),
    JSON.stringify(packageJson),
  );

  Logger.log('monopack: Build package.json finished successfully');

  let yarnLockFile: string | null = path.join(
    monorepoRootFullPath,
    'yarn.lock',
  );
  yarnLockFile = fs.readFileSync(yarnLockFile) ? yarnLockFile : null;

  if (yarnLockFile) {
    Logger.log(
      `monopack: Will copy yarn.lock from ${chalk.cyan(yarnLockFile)}`,
    );

    fs.copyFileSync(yarnLockFile, path.join(outputFullPath, 'yarn.lock'));
  }

  if (config.installPackages) {
    await installExternalPackages(outputFullPath);
  }
};
