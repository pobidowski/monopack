import path from 'path';
import fs from 'fs';
import * as lockfile from '@yarnpkg/lockfile';
import { CollectedDependencyInterface } from '../interfaces/CollectedDependencyInterface';

const cachedPackageJsons: Record<string, any> = {};

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
    const packageJsonVersion = pkg.dependencies[packageName];

    if (packageJsonVersion) {
      const packageAndVersion = `${packageName}@${packageJsonVersion}`;

      let yarnLockMatchingPackage;
      for (let j = i; j < packages.length; j++) {
        const yarnLock = packages[j].lockFile;
        if (yarnLock && yarnLock.dependencies[packageAndVersion]) {
          yarnLockMatchingPackage = yarnLock;
          break;
        }
      }

      _collectPeerDependencies(pkg.path, packageName, monorepoRootPath);

      collectedDependencies.push({
        packageName,
        context,
        declaredVersion: packageJsonVersion,
        resolvedVersion: yarnLockMatchingPackage
          ? yarnLockMatchingPackage.dependencies[packageAndVersion].version
          : null,
        yarnLockPath: yarnLockMatchingPackage
          ? yarnLockMatchingPackage.path
          : null,
      });
    }
  }
};

const _getPackageJsons = (context: string, monorepoRootPath: string): any => {
  const packageJson = _getPackageJsonCached(context);

  if (context !== monorepoRootPath) {
    return [
      ...(packageJson ? [packageJson] : []),
      ..._getPackageJsons(path.join(context, '..'), monorepoRootPath),
    ];
  }

  return packageJson ? [packageJson] : [];
};

const _getPackageJsonCached = (context: string) => {
  let packageJson = cachedPackageJsons[context];

  if (!packageJson) {
    packageJson = _getPackageJson(context);
  }

  return packageJson;
};

const _getPackageJson = (context: string) => {
  const packageJsonFile = path.join(context, 'package.json');

  if (fs.existsSync(packageJsonFile)) {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'));
    const yarnLockFile = path.join(context, 'yarn.lock');

    let lockFile = null;

    if (fs.existsSync(yarnLockFile)) {
      const lockFileContent = fs.readFileSync(yarnLockFile, 'utf-8');

      const yarnLock = lockfile.parse(lockFileContent);

      lockFile = {
        path: context,
        dependencies: yarnLock.object,
      };
    }

    return {
      path: context,
      dependencies: pkgJson.dependencies || {},
      devDependencies: pkgJson.devDependencies || {},
      peerDependencies: pkgJson.peerDependencies || {},
      lockFile,
    };
  }

  return undefined;
};

const _collectPeerDependencies = (
  context: string,
  packageName: string,
  monorepoRootPath: string,
  initialContext: string = context,
): void => {
  const installedPackageDir = path.join(context, 'node_modules', packageName);
  if(!visitedPeerDependencyContexts.includes(installedPackageDir)) {
    visitedPeerDependencyContexts.push(installedPackageDir);

    const installedPackagePackageJson = _getPackageJsonCached(
      installedPackageDir,
    );

    if (installedPackagePackageJson) {
      for (const peerDependency of Object.keys(
        installedPackagePackageJson.peerDependencies,
      )) {
        collectDependency(peerDependency, initialContext, monorepoRootPath);
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
