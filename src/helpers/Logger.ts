import chalk from 'chalk';

export const Logger = {
  log: (message: string) => console.log(chalk.white(message)),
  error: (message: string) => console.log(chalk.red(message)),
  success: (message: string) => console.log(chalk.green(message)),
  warning: (message: string) => console.log(chalk.yellow(message)),
};
