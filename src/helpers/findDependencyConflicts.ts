import { CollectedDependencyInterface } from '../interfaces/CollectedDependencyInterface';
import { ConflictInterface } from '../interfaces/ConflictInterface';

export const findDependencyConflicts = (
  collectedDependencies: CollectedDependencyInterface[],
): ConflictInterface[] => {
  const packagesVersions: Record<string, { version: string; context: string }> =
    {};

  const conflicts: ConflictInterface[] = [];

  for (let i = 0; i < collectedDependencies.length; i++) {
    const pkg = collectedDependencies[i];
    if (!packagesVersions[pkg.packageName]) {
      packagesVersions[pkg.packageName] = {
        version: pkg.version,
        context: pkg.context,
      };
    } else {
      if (packagesVersions[pkg.packageName].version !== pkg.version) {
        conflicts.push({
          packageName: pkg.packageName,
          conflict: [
            packagesVersions[pkg.packageName],
            { version: pkg.version, context: pkg.context },
          ],
        });
      }
    }
  }

  return conflicts;
};
