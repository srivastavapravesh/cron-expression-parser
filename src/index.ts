#!/usr/bin/env node
/**
 * Cron Expression Parser
 * 
 * This application parses standard cron expressions and expands each field
 * to show all the times at which it will run.
 * 
 * Usage: node dist/index.js "*\/15 0 1,15 * 1-5 /usr/bin/find"
 */

/**
 * Configuration for each cron field
 * Defines the valid range for each time component
 */
interface FieldConfig {
  name: string;      // Display name for output
  min: number;       // Minimum valid value
  max: number;       // Maximum valid value
}

/**
 * Field configurations in order: minute, hour, day of month, month, day of week
 * These define the boundaries for validation and expansion
 */
const FIELD_CONFIGS: FieldConfig[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 6 },  // 0 = Sunday, 6 = Saturday (some systems use 7 for Sunday too)
];

/**
 * Parses a single cron field expression and returns all matching values
 * 
 * Supported formats:
 * - * : All values (e.g., * in minute = 0-59)
 * - 5 : Specific value (e.g., 5 = just 5)
 * - 1-5 : Range (e.g., 1-5 = 1,2,3,4,5)
 * - *\/15 : Step values (e.g., *\/15 in minute = 0,15,30,45)
 * - 10-20/2 : Range with step (e.g., 10-20/2 = 10,12,14,16,18,20)
 * - 1,3,5 : List (e.g., 1,3,5 = 1,3,5)
 * - Combinations: 1,5-10,*\/15 (comma-separated expressions)
 * 
 * @param expression - The cron field expression to parse
 * @param min - Minimum valid value for this field
 * @param max - Maximum valid value for this field
 * @returns Sorted array of all values that match the expression
 */
function parseField(expression: string, min: number, max: number): number[] {
  const values = new Set<number>();

  // Split by comma to handle multiple expressions (e.g., "1,5,10-15")
  const parts = expression.split(',');

  for (const part of parts) {
    // Handle step values (e.g., "*/5" or "10-20/2")
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);

      if (isNaN(step) || step <= 0) {
        throw new Error(`Invalid step value: ${stepStr}`);
      }

      // Determine the range for stepping
      let rangeMin = min;
      let rangeMax = max;

      if (range !== '*') {
        // Handle range like "10-20/2"
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(s => parseInt(s, 10));
          if (isNaN(start) || isNaN(end)) {
            throw new Error(`Invalid range in step expression: ${range}`);
          }
          rangeMin = start;
          rangeMax = end;
        } else {
          // Handle single value with step like "5/10" (uncommon but valid in some interpretations)
          rangeMin = parseInt(range, 10);
          if (isNaN(rangeMin)) {
            throw new Error(`Invalid value in step expression: ${range}`);
          }
        }
      }

      // Generate values with step
      for (let i = rangeMin; i <= rangeMax; i += step) {
        if (i >= min && i <= max) {
          values.add(i);
        }
      }
    }
    // Handle ranges (e.g., "5-10")
    else if (part.includes('-') && part.indexOf('-') > 0) {
      const [start, end] = part.split('-').map(s => parseInt(s, 10));

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range: ${part}`);
      }

      if (start > end) {
        throw new Error(`Invalid range: start (${start}) > end (${end})`);
      }

      // Add all values in the range
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) {
          values.add(i);
        }
      }
    }
    // Handle wildcard (all values)
    else if (part === '*') {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
    }
    // Handle specific values (e.g., "5")
    else {
      const value = parseInt(part, 10);
      if (isNaN(value)) {
        throw new Error(`Invalid value: ${part}`);
      }
      if (value >= min && value <= max) {
        values.add(value);
      } else {
        throw new Error(`Value ${value} out of range [${min}-${max}]`);
      }
    }
  }

  // Convert Set to sorted array
  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Parses a complete cron expression and returns formatted output
 * 
 * @param cronExpression - Complete cron string (5 time fields + command)
 * @returns Formatted string showing expanded fields
 */
function parseCronExpression(cronExpression: string): string {
  // Split the input string by whitespace
  const parts = cronExpression.trim().split(/\s+/);

  // Validate input: need at least 6 parts (5 time fields + command)
  if (parts.length < 6) {
    throw new Error(
      `Invalid cron expression. Expected at least 6 fields, got ${parts.length}. ` +
      `Format: <minute> <hour> <day of month> <month> <day of week> <command>`
    );
  }

  // Extract time fields and command
  const timeFields = parts.slice(0, 5);
  const command = parts.slice(5).join(' '); // Rejoin in case command has spaces

  const output: string[] = [];

  // Parse each time field
  timeFields.forEach((field, index) => {
    const config = FIELD_CONFIGS[index];
    const values = parseField(field, config.min, config.max);
    
    // Format: field name (14 chars) + space-separated values
    const fieldName = config.name.padEnd(14);
    const valueString = values.join(' ');
    output.push(`${fieldName}${valueString}`);
  });

  // Add command line
  const commandLine = 'command'.padEnd(14) + command;
  output.push(commandLine);

  return output.join('\n');
}

/**
 * Main entry point
 * Reads cron expression from command line and outputs parsed result
 */
function main() {
  // Get command line arguments (skip node and script name)
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No cron expression provided');
    console.error('Usage: cron-parser "<minute> <hour> <day> <month> <day-of-week> <command>"');
    console.error('Example: cron-parser "*/15 0 1,15 * 1-5 /usr/bin/find"');
    process.exit(1);
  }

  // The entire cron expression should be passed as a single argument
  const cronExpression = args.join(' ');

  try {
    const result = parseCronExpression(cronExpression);
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('Error parsing cron expression:', (error as Error).message);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

// Export for testing
export { parseField, parseCronExpression, FIELD_CONFIGS };