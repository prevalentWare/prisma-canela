import chalk from 'chalk';

/**
 * Log levels available in the application.
 * The order determines verbosity (higher index = more verbose).
 */
export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  DEBUG = 4,
}

/** Configuration for the logger */
export interface LoggerConfig {
  /** The current log level */
  level: LogLevel;
  /** Whether to show timestamps in logs */
  showTimestamps: boolean;
  /** Whether to colorize the output */
  useColors: boolean;
}

// Type for chalk color functions
type ChalkColorFunction = typeof chalk.red;

/** Global logger configuration */
let config: LoggerConfig = {
  level: LogLevel.INFO, // Default level
  showTimestamps: false,
  useColors: true,
};

/**
 * Configure the logger settings
 * @param newConfig Partial configuration to apply
 */
export const configureLogger = (newConfig: Partial<LoggerConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Set the current log level
 * @param level The new log level
 */
export const setLogLevel = (level: LogLevel | string): void => {
  if (typeof level === 'string') {
    // Handle string levels (from CLI or env vars)
    const normalizedLevel = level.toUpperCase();
    const levelMap: Record<string, LogLevel> = {
      SILENT: LogLevel.SILENT,
      ERROR: LogLevel.ERROR,
      WARNING: LogLevel.WARNING,
      WARN: LogLevel.WARNING,
      INFO: LogLevel.INFO,
      DEBUG: LogLevel.DEBUG,
    };

    config.level = levelMap[normalizedLevel] ?? LogLevel.INFO;
  } else {
    config.level = level;
  }
};

/** Get timestamp string for logs */
const getTimestamp = (): string => {
  if (!config.showTimestamps) return '';

  const now = new Date();
  return `[${now.toISOString()}] `;
};

/** Format log prefix with optional color */
const formatPrefix = (
  prefix: string,
  prefixColor?: ChalkColorFunction
): string => {
  const formatted = `[${prefix}]`;
  if (config.useColors && prefixColor) {
    return prefixColor(formatted);
  }
  return formatted;
};

// Use process.stdout.write instead of console.log
const writeToStdout = (message: string, ...args: unknown[]): void => {
  process.stdout.write(message + '\n');

  if (args.length > 0) {
    // For objects/arrays, we still need to use console.log for proper formatting
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/** Helper for internal log handling */
const log = (
  level: LogLevel,
  prefix: string,
  prefixColor: ChalkColorFunction | undefined,
  message: string,
  ...args: unknown[]
): void => {
  if (level > config.level) return;

  const timestamp = getTimestamp();
  const formattedPrefix = formatPrefix(prefix, prefixColor);

  // Insert indentation for multiline messages
  const indentedMessage = message.replace(/\n/g, '\n  ');

  // Format the log message
  const fullMessage = `${timestamp}${formattedPrefix} ${indentedMessage}`;

  writeToStdout(fullMessage, ...args);
};

/** Log an error message */
export const error = (message: string, ...args: unknown[]): void => {
  log(LogLevel.ERROR, 'ERROR', chalk.red, message, ...args);
};

/** Log a warning message */
export const warn = (message: string, ...args: unknown[]): void => {
  log(LogLevel.WARNING, 'WARN', chalk.yellow, message, ...args);
};

/** Log an info message */
export const info = (message: string, ...args: unknown[]): void => {
  log(LogLevel.INFO, 'INFO', chalk.blue, message, ...args);
};

/** Log a success message (info level) */
export const success = (message: string, ...args: unknown[]): void => {
  log(LogLevel.INFO, 'SUCCESS', chalk.green, message, ...args);
};

/** Log a debug message */
export const debug = (message: string, ...args: unknown[]): void => {
  log(LogLevel.DEBUG, 'DEBUG', chalk.magenta, message, ...args);
};

/** Banner has its own special formatting */
export const banner = (): void => {
  if (config.level === LogLevel.SILENT) return;

  // eslint-disable-next-line no-console
  console.log(
    chalk.bold(
      chalk.hex('#2D7BD8')(
        `
   ██████╗ █████╗ ███╗   ██╗███████╗██╗      █████╗ 
  ██╔════╝██╔══██╗████╗  ██║██╔════╝██║     ██╔══██╗
  ██║     ███████║██╔██╗ ██║█████╗  ██║     ███████║
  ██║     ██╔══██║██║╚██╗██║██╔══╝  ██║     ██╔══██║
  ╚██████╗██║  ██║██║ ╚████║███████╗███████╗██║  ██║
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═╝
`
      )
    )
  );
  // eslint-disable-next-line no-console
  console.log(
    chalk.italic(
      chalk.hex('#1A4D85')('                     by prevalentWare\n')
    )
  );
};

/**
 * Create a prefixed logger for a specific component
 * Useful for adding context to logs from different parts of the system
 * @param prefix The prefix to add to log messages
 * @returns An object with methods for each log level
 */
export const createPrefixedLogger = (
  prefix: string
): {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
} => {
  const componentPrefix = `${prefix}`;

  return {
    error: (message: string, ...args: unknown[]): void =>
      log(
        LogLevel.ERROR,
        `ERROR:${componentPrefix}`,
        chalk.red,
        message,
        ...args
      ),
    warn: (message: string, ...args: unknown[]): void =>
      log(
        LogLevel.WARNING,
        `WARN:${componentPrefix}`,
        chalk.yellow,
        message,
        ...args
      ),
    info: (message: string, ...args: unknown[]): void =>
      log(
        LogLevel.INFO,
        `INFO:${componentPrefix}`,
        chalk.blue,
        message,
        ...args
      ),
    success: (message: string, ...args: unknown[]): void =>
      log(
        LogLevel.INFO,
        `SUCCESS:${componentPrefix}`,
        chalk.green,
        message,
        ...args
      ),
    debug: (message: string, ...args: unknown[]): void =>
      log(
        LogLevel.DEBUG,
        `DEBUG:${componentPrefix}`,
        chalk.magenta,
        message,
        ...args
      ),
  };
};
