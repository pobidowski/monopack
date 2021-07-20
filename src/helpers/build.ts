import { Logger } from './Logger';
import webpack, { Configuration } from 'webpack';

export const build = async (webpackConfig: Configuration) => {
  Logger.log('webpack: Complication started');

  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err) {
        Logger.error('webpack: Compilation failed!');

        reject(err);
        return;
      }

      if (stats?.hasErrors()) {
        Logger.error('webpack: Compilation failed!');
        console.log(stats?.toJson().errors);

        reject();
        return;
      }

      if (stats?.hasWarnings()) {
        Logger.warning('webpack: Compilation warnings!');
        console.log(stats?.toJson().warnings);

        reject();
        return;
      }

      Logger.log('webpack: Complication finished successfully');
      resolve(1);
      return;
    });
  });
};
