# Cron Expression Parser

A command-line tool that parses standard cron expressions and expands each field to show the times at which it will run.

## Features

- ✅ Parses all standard cron time fields (minute, hour, day of month, month, day of week)
- ✅ Supports wildcards (`*`), ranges (`1-5`), lists (`1,3,5`), and step values (`*/15`)
- ✅ Handles complex combinations (`1-5,10,*/20`)
- ✅ Comprehensive error handling with helpful messages
- ✅ Full test coverage with Jest
- ✅ Written in TypeScript for type safety
- ✅ No external cron parsing libraries used

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/srivastavapravesh/cron-expression-parser.git
cd cron-expression-parser
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Basic Usage

```bash
node dist/index.js "*/15 0 1,15 * 1-5 /usr/bin/find"
```

### Output

```
minute        0 15 30 45
hour          0
day of month  1 15
month         1 2 3 4 5 6 7 8 9 10 11 12
day of week   1 2 3 4 5
command       /usr/bin/find
```

### More Examples

**Every hour at minute 0:**
```bash
node dist/index.js "0 * * * * /usr/bin/hourly-task"
```

**Every weekday at 9 AM:**
```bash
node dist/index.js "0 9 * * 1-5 /usr/bin/backup"
```

**Every 30 minutes during business hours:**
```bash
node dist/index.js "*/30 9-17 * * * /usr/bin/check-status"
```

**First and fifteenth of each month:**
```bash
node dist/index.js "0 0 1,15 * * /usr/bin/monthly-report"
```

## Supported Cron Syntax

### Field Format

The cron expression consists of 5 time fields followed by a command:

```
<minute> <hour> <day of month> <month> <day of week> <command>
```

| Field         | Required | Allowed Values | Allowed Special Characters |
|---------------|----------|----------------|----------------------------|
| minute        | Yes      | 0-59           | `*` `,` `-` `/`           |
| hour          | Yes      | 0-23           | `*` `,` `-` `/`           |
| day of month  | Yes      | 1-31           | `*` `,` `-` `/`           |
| month         | Yes      | 1-12           | `*` `,` `-` `/`           |
| day of week   | Yes      | 0-6 (0=Sunday) | `*` `,` `-` `/`           |
| command       | Yes      | Any string     | N/A                        |

### Special Characters

- **`*` (asterisk)**: Matches all values in the field
  - Example: `*` in the minute field = every minute (0-59)

- **`,` (comma)**: Separates multiple values
  - Example: `1,15,30` = values 1, 15, and 30

- **`-` (hyphen)**: Defines a range
  - Example: `1-5` = values 1, 2, 3, 4, 5

- **`/` (slash)**: Defines step values
  - Example: `*/15` = every 15 units starting from 0
  - Example: `10-20/2` = every 2 units from 10 to 20 (10, 12, 14, 16, 18, 20)

### Combination Examples

You can combine these operators:
- `1-5,10,*/20` = values 1,2,3,4,5,10,0,20,40 (then sorted)
- `*/10,25-30` = values 0,10,20,25,26,27,28,29,30,40,50

## Development

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Check Test Coverage

```bash
npm run test:coverage
```

### Run with Development Mode (ts-node)

```bash
npm run dev "*/15 0 1,15 * 1-5 /usr/bin/find"
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Project Structure

```
cron-expression-parser/
├── src/
│   ├── index.ts          # Main application logic
│   └── index.test.ts     # Test suite
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## How It Works

### Architecture Overview

The parser follows a simple, functional approach:

1. **Input Parsing**: Split the input string into 5 time fields + command
2. **Field Expansion**: Each field is independently parsed and expanded
3. **Output Formatting**: Results are formatted as a table

### Core Algorithm: `parseField()`

This is the heart of the parser. For each field expression, it:

1. **Splits by comma** to handle multiple expressions (e.g., `1,5-10`)
2. **Processes each part**:
   - **Wildcard (`*`)**: Generates all values from min to max
   - **Range (`1-5`)**: Generates sequence from start to end
   - **Step (`*/15` or `10-20/2`)**: Generates values at step intervals
   - **Specific value (`5`)**: Adds single value
3. **Uses a Set** to automatically deduplicate values
4. **Returns sorted array** for consistent output

### Example Walkthrough

For the expression `*/15 0 1,15 * 1-5 /usr/bin/find`:

**Minute field: `*/15`**
- Split by `/` → range: `*`, step: `15`
- `*` means 0-59
- Step by 15: [0, 15, 30, 45]

**Hour field: `0`**
- Single value: [0]

**Day of month: `1,15`**
- Split by `,` → `1` and `15`
- Result: [1, 15]

**Month: `*`**
- All values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

**Day of week: `1-5`**
- Range from 1 to 5: [1, 2, 3, 4, 5]

### Error Handling

The parser validates:
- ✅ Correct number of fields (must be 6+)
- ✅ Values within valid ranges
- ✅ Valid syntax for ranges and steps
- ✅ Proper numeric values (no invalid characters)

Errors are thrown with descriptive messages to help users fix their expressions.

## Design Decisions

### Why TypeScript?

- **Type Safety**: Catches errors at compile time
- **Better IDE Support**: Autocomplete and inline documentation
- **Self-Documenting**: Interfaces clearly show data structures
- **Refactoring Confidence**: Easy to extend without breaking things

### Why No Classes?

- **Simplicity**: This is a straightforward parsing task
- **Testability**: Pure functions are easier to test
- **Functional Approach**: Fits the nature of the problem (input → transformation → output)

### Why Set for Deduplication?

- **Automatic**: No need to manually check for duplicates
- **Efficient**: O(1) lookups and insertions
- **Clean**: Converting to sorted array is simple

### Why Split Parsing Logic?

- **Single Responsibility**: Each function does one thing
- **Reusability**: `parseField()` can be used independently
- **Testability**: Easy to test each part in isolation
- **Extensibility**: Adding new syntax is straightforward

## Testing Strategy

The test suite covers:

1. **Unit Tests**: Each parsing rule in isolation
   - Wildcards, ranges, lists, steps
   - Edge cases (min/max values, empty ranges)
   - Error conditions (invalid syntax, out of range)

2. **Integration Tests**: Full cron expressions
   - Example from requirements
   - Real-world use cases
   - Complex combinations

3. **Property Tests**: General behaviors
   - Output is always sorted
   - No duplicates in results
   - All values within valid ranges