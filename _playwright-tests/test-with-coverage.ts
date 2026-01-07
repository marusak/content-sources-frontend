/**
 * Test utilities with automatic coverage collection
 * 
 * This is a drop-in replacement for 'test-utils' that automatically
 * collects coverage when COLLECT_COVERAGE=true.
 * 
 * Simply change your import from:
 *   import { test, expect } from 'test-utils';
 * 
 * To:
 *   import { test, expect } from '../test-with-coverage';
 * 
 * The 'page' fixture works exactly the same - you just get automatic coverage!
 */
export * from './fixtures/coverage-fixture';

