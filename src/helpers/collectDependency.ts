import path from 'path';
import fs from 'fs';
import { parseSyml } from '@yarnpkg/parsers';
import { CollectedDependencyInterface } from '../interfaces/CollectedDependencyInterface';

const cachedPackageJsons: Record<string, any[]> = {};

export const collectedDependencies: CollectedDependencyInterface[] = [];
const visitedPeerDependencyContexts: string[] = [];

export const collectDependency = (
  packageName: string,
  context: string,
  monorepoRootPath: string,
): void => {
  const packages = _getPackageJsons(context, monorepoRootPath);

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const packageJsonVersion = pkg.dependencies[packageName] || pkg.peerDependencies[packageName];

    if (packageJsonVersion) {
      const packageAndVersion = `${packageName}@npm:${packageJsonVersion}`;

      let yarnLockMatchingPackageVersion = null;
      let yarnLockMatchingPath = null;
      for (let j = i; j < packages.length; j++) {
        const yarnLock = packages[j].lockFile;

        if (yarnLock) {
          let dependency = packageAndVersion;
          if(!yarnLock.dependencies[dependency]) {
            dependency = Object.keys(yarnLock.dependencies).filter((v) => v.includes(',') ? v.split(', ').some(t => t == packageAndVersion) : v === packageAndVersion)[0];
          }

          if(dependency) {
            yarnLockMatchingPackageVersion = yarnLock.dependencies[dependency].version;
            yarnLockMatchingPath = yarnLock.path;
            break;
          }
        }
      }

        collectedDependencies.push({
          packageName,
          context,
          declaredVersion: packageJsonVersion,
          resolvedVersion: yarnLockMatchingPackageVersion,
          yarnLockPath: yarnLockMatchingPath,
        });

      _collectPeerDependencies(pkg.path, packageName, monorepoRootPath);
    }
  }
};

const _getPackageJsons = (context: string, monorepoRootPath: string): any => {
  const packageJsons = _getPackageJsonCached(context);

  if (context !== monorepoRootPath) {
    return [
      ...(packageJsons || []),
      ..._getPackageJsons(path.join(context, '..'), monorepoRootPath),
    ];
  }

  return packageJsons || [];
};

const _getPackageJsonCached = (context: string) => {
  let packageJsons = cachedPackageJsons[context];

  if (!packageJsons) {
    packageJsons = _getPackageJson(context);
  }

  return packageJsons;
};

const _getPackageJson = (context: string) => {
  const packageJsonFile = path.join(context, 'package.json');

  if (fs.existsSync(packageJsonFile)) {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'));
    const yarnLockFile = path.join(context, 'yarn.lock');

    let lockFile = null;

    if (fs.existsSync(yarnLockFile)) {
      const lockFileContent = fs.readFileSync(yarnLockFile, 'utf-8');

      const yarnLock = parseSyml(lockFileContent);

      lockFile = {
        path: context,
        dependencies: yarnLock,
      };
    }

    const packageJson = {
      path: context,
      dependencies: pkgJson.dependencies || {},
      devDependencies: pkgJson.devDependencies || {},
      peerDependencies: pkgJson.peerDependencies || {},
      lockFile,
    };

    if(!cachedPackageJsons[context]) {
      cachedPackageJsons[context] = [];
    }

    cachedPackageJsons[context].push(packageJson);

    return cachedPackageJsons[context];
  }

  return [];
};

const _collectPeerDependencies = (
  context: string,
  packageName: string,
  monorepoRootPath: string,
  initialContext: string = context,
): void => {
  const installedPackageDir = path.join(context, 'node_modules', packageName);
  if (!visitedPeerDependencyContexts.includes(installedPackageDir)) {
    visitedPeerDependencyContexts.push(installedPackageDir);

    const installedPackagePackageJson = _getPackageJsonCached(
      installedPackageDir,
    );

    if (installedPackagePackageJson.length) {
      // cachedPackageJsons[initialContext].push(...installedPackagePackageJson);

      for(let i = 0; i < installedPackagePackageJson.length; i++) {
        for (const peerDependency of Object.keys(
          installedPackagePackageJson[i].peerDependencies,
        )) {
          collectDependency(peerDependency, initialContext, monorepoRootPath);
        }
      }
    } else {
      if (context !== monorepoRootPath) {
        _collectPeerDependencies(
          path.join(context, '..'),
          packageName,
          monorepoRootPath,
          initialContext,
        );
      }
    }
  }
};
