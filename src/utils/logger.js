import chalk from 'chalk';

export function logStep(stepNum, title) {
  console.log(`\n${chalk.red.bold(`[Step ${stepNum}]`)} ${chalk.white.bold(title)}`);
  console.log(chalk.gray('─'.repeat(60)));
}

export function logSuccess(msg) {
  console.log(`${chalk.green('✔')} ${chalk.green.bold(msg)}`);
}

export function logWarning(msg) {
  console.log(`${chalk.yellow('⚠')} ${chalk.yellow(msg)}`);
}

export function logError(msg) {
  console.log(`${chalk.red('✖')} ${chalk.red.bold(msg)}`);
}

export function logInfo(msg) {
  console.log(`${chalk.blue('ℹ')} ${chalk.white(msg)}`);
}
