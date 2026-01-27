// Logger utility

export const logger = {
  info: (message: string, ...args: any[]) => console.info(`[SUSE AI] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[SUSE AI] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[SUSE AI] ${message}`, ...args)
};