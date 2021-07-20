export interface CollectedDependencyInterface {
  packageName: string;
  context: string;
  declaredVersion: string;
  resolvedVersion: string;
  yarnLockPath: string;
}
