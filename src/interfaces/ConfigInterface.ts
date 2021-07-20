export interface ConfigInterface {
  output: string;
  installPackages: boolean;
  externalModules: string[];
  monorepoRootPath: string;
  modifyPackageJson: (pkg: Record<string, any>) => Record<string, any>;
  modifyWebpackConfig: (
    defaultConfig: Record<string, any>,
  ) => Record<string, any>;
}
