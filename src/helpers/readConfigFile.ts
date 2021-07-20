import { ConfigInterface } from '../interfaces/ConfigInterface';

export const readConfigFile = (configFile: string): ConfigInterface => {
  const config = require(configFile);

  const defaultModifyPackageJson = (pkg: Record<string, any>) => pkg;
  const defaultModifyWebpackConfig = (defaultConfig: Record<string, any>) =>
    defaultConfig;

  return {
    output: config.output || 'dist',
    installPackages: config.installPackages || false,
    externalModules: config.externalModules || [],
    monorepoRootPath: config.monorepoRootPath || './',
    modifyPackageJson: config.modifyPackageJson || defaultModifyPackageJson,
    modifyWebpackConfig:
      config.modifyWebpackConfig || defaultModifyWebpackConfig,
  };
};
