import { Logger } from './Logger';
import { exec } from 'child_process';

export const installExternalPackages = async (outputFullPath: string) => {
  Logger.log('monopack: Installing external packages started');

  return new Promise((resolve, reject) => {
    exec(`cd ${outputFullPath} && yarn install`, (error, stdout, stderr) => {
      if (error) {
        Logger.error('monopack: Installing external packages failed!');

        reject(error);
      }

      if (stderr) {
        Logger.error('monopack: Installing external packages failed!');
        console.log(stderr);
        reject();
        return;
      }

      Logger.log(
        'monopack: Installing external packages finished successfully',
      );
      resolve(1);
    });
  });
};
