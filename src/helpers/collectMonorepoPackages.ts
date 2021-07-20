import fs from 'fs';
import path from 'path';
import glob from 'glob-promise';

export const collectMonorepoPackages = async (
  monorepoRootPath: string,
  file: string,
  property: string,
): Promise<string[]> => {
  const packages = [];

  if (fs.existsSync(path.join(monorepoRootPath, file))) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(monorepoRootPath, file), 'utf-8'),
    );

    if (Array.isArray(pkg[property])) {
      for (const subPackageGlob of pkg[property]) {
        const subPackagePaths = await glob(subPackageGlob, {
          cwd: monorepoRootPath,
        });

        for (const subPackagePath of subPackagePaths) {
          const subPackageFullPath = path.join(
            monorepoRootPath,
            subPackagePath,
            'package.json',
          );

          const subPackage = JSON.parse(
            fs.readFileSync(subPackageFullPath, 'utf-8'),
          );

          packages.push(subPackage.name);
        }
      }
    }
  }

  return packages;
};
