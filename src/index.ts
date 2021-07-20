import yargs from 'yargs';

import { main } from './main';

export function run(): void {
  const args = yargs(process.argv)
    .option('inputFile', {
      alias: 'i',
      type: 'string',
      describe: 'Input file (e.g. src/main.ts)',
      default: 'src/main.ts',
    })
    .option('config', {
      alias: 'c',
      type: 'string',
      describe: 'Config file (e.g. monopack.config.js)',
      nargs: 1,
      default: 'monopack.config.js',
    })
    .strict().argv as any;

  main({
    inputFile: args.inputFile,
    configFile: args.config,
  })
    .then(() => {
      process.exit();
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
