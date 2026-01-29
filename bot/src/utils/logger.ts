const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

const levelPriority: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const threshold = levelPriority[logLevel] ?? levelPriority.info;

function shouldLog(level: keyof typeof levelPriority): boolean {
  return isDevelopment || levelPriority[level] <= threshold;
}

export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
