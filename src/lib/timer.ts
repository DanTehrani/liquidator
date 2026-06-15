import chalk from 'chalk';
import { logger } from '../logger';

export interface Timer {
  startTime: number;
  label: string;
}

/**
 * Start a timer
 * @param label - The label of the timer
 * @returns The timer object
 */
export const st = (label: string): Timer => {
  return {
    startTime: performance.now(),
    label,
  };
};

/**
 * End a timer
 * @param timer - The timer object
 */
export const ed = (timer: Timer) => {
  const endTime = performance.now();
  const duration = endTime - timer.startTime;

  const durationInMs = duration;

  const message = `timer: ${durationInMs}ms ${timer.label}`;

  logger.info(chalk.cyan(message), {
    duration: durationInMs,
    label: timer.label,
  });

  return durationInMs;
};
