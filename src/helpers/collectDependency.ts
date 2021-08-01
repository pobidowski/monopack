import path from 'path';
import fs from 'fs';
import { CollectedDependencyInterface } from '../interfaces/CollectedDependencyInterface';

const cachedPackageJsons: Record<string, any[]> = {};

export const collectedDependencies: CollectedDependencyInterface[] = [];
const visitedPeerDependencyContexts: string[] = [];

export enum CollectDependencyTypes {
  INLINE = 'INLINE',
  IMPORT = 'IMPORT',
}

export const collectDependency = (
  packageName: string,
  context: string,
  monorepoRootPath: string,
  yarnLockDependencies: Record<string, any>,
): CollectDependencyTypes => {
  const yarnLockPackagesKeys = Object.keys(yarnLockDependencies).filter((k) =>
    k.startsWith(`${packageName}@`),
  );

  let output = CollectDependencyTypes.IMPORT;

  if (yarnLockPackagesKeys.length) {
    const packages = _getPackageJsons(context, monorepoRootPath);

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const packageJsonVersion =
        pkg.dependencies[packageName] || pkg.peerDependencies[packageName];

      if (packageJsonVersion) {
        yarnLockPackagesKeys.forEach((t) => {
          const yarnDep = yarnLockDependencies[t];

          if (t.includes(packageJsonVersion)) {
            if (yarnDep.resolution.includes('workspace')) {
              output = CollectDependencyTypes.INLINE;
            } else {
              collectedDependencies.push({
                packageName,
                context,
                version: yarnDep.version,
              });

              _collectPeerDependencies(
                pkg.path,
                packageName,
                monorepoRootPath,
                yarnLockDependencies,
              );
            }
          }
        });
      }
    }
  }

  return output;
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

    const packageJson = {
      path: context,
      dependencies: pkgJson.dependencies || {},
      devDependencies: pkgJson.devDependencies || {},
      peerDependencies: pkgJson.peerDependencies || {},
    };

    if (!cachedPackageJsons[context]) {
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
  yarnLockDependencies: Record<string, any>,
  initialContext: string = context,
): void => {
  const installedPackageDir = path.join(context, 'node_modules', packageName);
  if (!visitedPeerDependencyContexts.includes(installedPackageDir)) {
    visitedPeerDependencyContexts.push(installedPackageDir);

    const installedPackagePackageJson =
      _getPackageJsonCached(installedPackageDir);

    if (installedPackagePackageJson.length) {
      for (let i = 0; i < installedPackagePackageJson.length; i++) {
        for (const peerDependency of Object.keys(
          installedPackagePackageJson[i].peerDependencies,
        )) {
          collectDependency(
            peerDependency,
            initialContext,
            monorepoRootPath,
            yarnLockDependencies,
          );
        }
      }
    } else {
      if (context !== monorepoRootPath) {
        _collectPeerDependencies(
          path.join(context, '..'),
          packageName,
          monorepoRootPath,
          yarnLockDependencies,
          initialContext,
        );
      }
    }
  }
};
