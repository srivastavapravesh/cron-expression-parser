/**
 * Test suite for Cron Expression Parser
 * 
 * Tests cover:
 * - Basic field parsing (wildcards, ranges, lists, steps)
 * - Complex expressions (combinations)
 * - Edge cases and error handling
 * - Full cron expression parsing
 */

import { parseField, parseCronExpression, FIELD_CONFIGS } from './index';

describe('parseField', () => {
  describe('wildcards', () => {
    it('should expand * to all values in range', () => {
      expect(parseField('*', 0, 5)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(parseField('*', 1, 3)).toEqual([1, 2, 3]);
    });
  });

  describe('specific values', () => {
    it('should parse single values', () => {
      expect(parseField('5', 0, 10)).toEqual([5]);
      expect(parseField('0', 0, 10)).toEqual([0]);
    });

    it('should throw error for out of range values', () => {
      expect(() => parseField('60', 0, 59)).toThrow('out of range');
      expect(() => parseField('-1', 0, 59)).toThrow('out of range');
    });

    it('should throw error for invalid values', () => {
      expect(() => parseField('abc', 0, 59)).toThrow('Invalid value');
    });
  });

  describe('ranges', () => {
    it('should expand ranges', () => {
      expect(parseField('1-5', 0, 10)).toEqual([1, 2, 3, 4, 5]);
      expect(parseField('0-2', 0, 10)).toEqual([0, 1, 2]);
    });

    it('should throw error for invalid ranges', () => {
      expect(() => parseField('5-2', 0, 10)).toThrow('Invalid range');
      expect(() => parseField('a-b', 0, 10)).toThrow('Invalid range');
    });
  });

  describe('step values', () => {
    it('should handle */n syntax', () => {
      expect(parseField('*/15', 0, 59)).toEqual([0, 15, 30, 45]);
      expect(parseField('*/10', 0, 30)).toEqual([0, 10, 20, 30]);
    });

    it('should handle range with step', () => {
      expect(parseField('10-20/2', 0, 59)).toEqual([10, 12, 14, 16, 18, 20]);
      expect(parseField('1-10/3', 0, 59)).toEqual([1, 4, 7, 10]);
    });

    it('should throw error for invalid step values', () => {
      expect(() => parseField('*/0', 0, 59)).toThrow('Invalid step');
      expect(() => parseField('*/-5', 0, 59)).toThrow('Invalid step');
      expect(() => parseField('*/abc', 0, 59)).toThrow('Invalid step');
    });
  });

  describe('lists', () => {
    it('should parse comma-separated values', () => {
      expect(parseField('1,3,5', 0, 10)).toEqual([1, 3, 5]);
      expect(parseField('0,10,20', 0, 30)).toEqual([0, 10, 20]);
    });

    it('should parse mixed lists', () => {
      expect(parseField('1,5-7,10', 0, 15)).toEqual([1, 5, 6, 7, 10]);
      expect(parseField('1,15', 1, 31)).toEqual([1, 15]);
    });
  });

  describe('complex expressions', () => {
    it('should handle combination of ranges, lists, and steps', () => {
      expect(parseField('1-5,10,*/20', 0, 59)).toEqual([0, 1, 2, 3, 4, 5, 10, 20, 40]);
    });

    it('should deduplicate values', () => {
      expect(parseField('1,1,1', 0, 10)).toEqual([1]);
      expect(parseField('1-3,2-4', 0, 10)).toEqual([1, 2, 3, 4]);
    });

    it('should return sorted values', () => {
      expect(parseField('5,1,3', 0, 10)).toEqual([1, 3, 5]);
      expect(parseField('10,5-7,1', 0, 15)).toEqual([1, 5, 6, 7, 10]);
    });
  });
});

describe('parseCronExpression', () => {
  it('should parse the example from requirements', () => {
    const input = '*/15 0 1,15 * 1-5 /usr/bin/find';
    const output = parseCronExpression(input);
    
    expect(output).toContain('minute        0 15 30 45');
    expect(output).toContain('hour          0');
    expect(output).toContain('day of month  1 15');
    expect(output).toContain('month         1 2 3 4 5 6 7 8 9 10 11 12');
    expect(output).toContain('day of week   1 2 3 4 5');
    expect(output).toContain('command       /usr/bin/find');
  });

  it('should handle command with spaces', () => {
    const input = '0 0 * * * /usr/bin/command --flag value';
    const output = parseCronExpression(input);
    
    expect(output).toContain('command       /usr/bin/command --flag value');
  });

  it('should handle all wildcards', () => {
    const input = '* * * * * /bin/sh';
    const output = parseCronExpression(input);
    
    expect(output).toContain('0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59');
    expect(output).toContain('day of month  1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31');
  });

  it('should throw error for invalid input', () => {
    expect(() => parseCronExpression('* * * *')).toThrow('Invalid cron expression');
    expect(() => parseCronExpression('')).toThrow('Invalid cron expression');
  });

  it('should handle complex real-world examples', () => {
    // Every weekday at 9 AM
    const weekdayMorning = '0 9 * * 1-5 /usr/bin/backup';
    const output1 = parseCronExpression(weekdayMorning);
    expect(output1).toContain('minute        0');
    expect(output1).toContain('hour          9');
    expect(output1).toContain('day of week   1 2 3 4 5');

    // Every 30 minutes during business hours
    const businessHours = '*/30 9-17 * * * /usr/bin/check';
    const output2 = parseCronExpression(businessHours);
    expect(output2).toContain('minute        0 30');
    expect(output2).toContain('hour          9 10 11 12 13 14 15 16 17');

    // First and last day of month
    const monthEnds = '0 0 1,31 * * /usr/bin/report';
    const output3 = parseCronExpression(monthEnds);
    expect(output3).toContain('day of month  1 31');
  });
});

describe('FIELD_CONFIGS', () => {
  it('should have correct configurations', () => {
    expect(FIELD_CONFIGS).toHaveLength(5);
    expect(FIELD_CONFIGS[0]).toEqual({ name: 'minute', min: 0, max: 59 });
    expect(FIELD_CONFIGS[1]).toEqual({ name: 'hour', min: 0, max: 23 });
    expect(FIELD_CONFIGS[2]).toEqual({ name: 'day of month', min: 1, max: 31 });
    expect(FIELD_CONFIGS[3]).toEqual({ name: 'month', min: 1, max: 12 });
    expect(FIELD_CONFIGS[4]).toEqual({ name: 'day of week', min: 0, max: 6 });
  });
});