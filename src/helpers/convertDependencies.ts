import { CollectedDependencyInterface } from '../interfaces/CollectedDependencyInterface';

export const convertDependencies = (
  collectedDependencies: CollectedDependencyInterface[],
): Record<string, string> => {
  const output: Record<string, string> = {};

  for (let i = 0; i < collectedDependencies.length; i++) {
    output[collectedDependencies[i].packageName] =
      collectedDependencies[i].version;
  }

  return output;
};
