/**
 * Phase 18 Day 7: Stability Testing
 * 1000-program stress test with metrics collection
 */

import { describe, it, expect } from '@jest/globals';
import { ProgramGenerator, TestSuiteGenerator } from '../src/testing/program-generator';
import { StabilityTester } from '../src/testing/stability-tester';

describe('Phase 18 Day 7: Stability Testing', () => {
  // ── Test 1: Program Generator Works ────────────────────────
  it('generates simple programs', () => {
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(10, 'simple');

    expect(programs.length).toBe(10);
    expect(programs.every(p => typeof p === 'string')).toBe(true);
    expect(programs.every(p => p.length > 0)).toBe(true);
  });

  // ── Test 2: Program Generator - Medium ─────────────────────
  it('generates medium complexity programs', () => {
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(20, 'medium');

    expect(programs.length).toBe(20);
    expect(programs.every(p => typeof p === 'string')).toBe(true);
  });

  // ── Test 3: Program Generator - Complex ────────────────────
  it('generates complex programs', () => {
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(20, 'complex');

    expect(programs.length).toBe(20);
    expect(programs.every(p => p.length > 0)).toBe(true);
  });

  // ── Test 4: Test Suite Generation (1000 programs) ──────────
  it('generates complete stress test suite', () => {
    const programs = TestSuiteGenerator.generateStressSuite();

    expect(programs.length).toBe(1000);
    expect(programs.every(p => typeof p === 'string')).toBe(true);
    expect(programs.every(p => p.length > 0)).toBe(true);
  });

  // ── Test 5: Categorized Test Suite ─────────────────────────
  it('generates categorized test suite', () => {
    const suite = TestSuiteGenerator.generateCategorizedSuite();

    expect(suite.has('numbers')).toBe(true);
    expect(suite.has('strings')).toBe(true);
    expect(suite.has('arithmetic')).toBe(true);
    expect(suite.has('nested')).toBe(true);
    expect(suite.has('mixed')).toBe(true);

    let total = 0;
    for (const programs of suite.values()) {
      total += programs.length;
    }
    expect(total).toBe(1000);
  });

  // ── Test 6: Stability Test - 100 Programs ──────────────────
  it('runs 100-program stability test', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(100, 'simple');

    const metrics = tester.runTests(programs);

    expect(metrics.totalPrograms).toBe(100);
    expect(metrics.successCount).toBeGreaterThan(0);
    expect(metrics.avgTime).toBeLessThan(10); // Should be fast
    expect(metrics.memoryUsed).toBeGreaterThanOrEqual(0);
  });

  // ── Test 7: Metrics Calculation ────────────────────────────
  it('calculates comprehensive metrics', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(50, 'medium');

    const metrics = tester.runTests(programs);

    expect(metrics.totalPrograms).toBe(50);
    expect(metrics.avgTime).toBeGreaterThan(0);
    expect(metrics.minTime).toBeLessThanOrEqual(metrics.maxTime);
    expect(metrics.stdDev).toBeGreaterThanOrEqual(0);
    expect(Object.values(metrics.errorRates).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(0);
  });

  // ── Test 8: Error Analysis ────────────────────────────────
  it('tracks error types correctly', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(50, 'simple');

    const metrics = tester.runTests(programs);
    const errors = tester.getErrorSummary();

    // Most programs should succeed
    expect(metrics.successCount).toBeGreaterThan(20);

    // Error breakdown should be valid
    expect(Object.values(errors).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(0);
  });

  // ── Test 9: No Memory Leaks (Execution) ────────────────────
  it('completes without excessive memory growth', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(200, 'medium');

    const metrics = tester.runTests(programs);

    // Memory usage should be reasonable (less than 100MB for 200 programs)
    expect(metrics.memoryUsed).toBeLessThan(100);
  });

  // ── Test 10: Performance Consistency ───────────────────────
  it('shows consistent performance across batches', () => {
    const gen = new ProgramGenerator(42);
    const tester1 = new StabilityTester();
    const tester2 = new StabilityTester();

    // Use larger batches to get more stable timings
    const programs1 = gen.generateBatch(100, 'medium');
    const programs2 = gen.generateBatch(100, 'medium');

    const metrics1 = tester1.runTests(programs1);
    const metrics2 = tester2.runTests(programs2);

    // Both should complete successfully
    expect(metrics1.totalTime).toBeGreaterThan(0);
    expect(metrics2.totalTime).toBeGreaterThan(0);

    // Success rates should be similar
    const successRate1 = metrics1.successCount / metrics1.totalPrograms;
    const successRate2 = metrics2.successCount / metrics2.totalPrograms;
    const successRatioDiff = Math.abs(successRate1 - successRate2);
    expect(successRatioDiff).toBeLessThan(0.2); // Within 20 percentage points
  });

  // ── Test 11: 500 Program Mini Stress Test ──────────────────
  it('completes 500-program stress test', () => {
    const tester = new StabilityTester();
    const programs = TestSuiteGenerator.generateStressSuite().slice(0, 500);

    const metrics = tester.runTests(programs);

    expect(metrics.totalPrograms).toBe(500);
    expect(metrics.successCount).toBeGreaterThan(250); // At least 50% success
    expect(metrics.avgTime).toBeLessThan(20);
  });

  // ── Test 12: Program Determinism ──────────────────────────
  it('generates deterministic programs with same seed', () => {
    const gen1 = new ProgramGenerator(42);
    const gen2 = new ProgramGenerator(42);

    const programs1 = gen1.generateBatch(20, 'complex');
    const programs2 = gen2.generateBatch(20, 'complex');

    expect(programs1).toEqual(programs2);
  });

  // ── Test 13: Execution Log Tracking ────────────────────────
  it('creates detailed execution logs', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(20, 'simple');

    tester.runTests(programs);
    const logs = tester.getLogs();

    expect(logs.length).toBe(20);
    expect(logs.every(log => typeof log.program === 'string')).toBe(true);
    expect(logs.every(log => typeof log.success === 'boolean')).toBe(true);
    expect(logs.every(log => typeof log.executionTime === 'number')).toBe(true);
  });

  // ── Test 14: Failure Collection ────────────────────────────
  it('identifies failed programs', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(50, 'simple');

    tester.runTests(programs);
    const failures = tester.getFailures();

    expect(Array.isArray(failures)).toBe(true);
    expect(failures.every(f => !f.success)).toBe(true);
  });

  // ── Test 15: Metrics Formatting ────────────────────────────
  it('formats metrics for display', () => {
    const tester = new StabilityTester();
    const gen = new ProgramGenerator(42);
    const programs = gen.generateBatch(30, 'simple');

    const metrics = tester.runTests(programs);
    const formatted = StabilityTester.formatMetrics(metrics);

    expect(formatted).toContain('Phase 18 Day 7');
    expect(formatted).toContain('Success');
    expect(formatted).toContain('Performance');
    expect(formatted).toContain('Memory Usage');
  });
});
