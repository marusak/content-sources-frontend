#!/usr/bin/env node

/**
 * Script to merge Playwright coverage reports with NYC
 * This merges multiple coverage files into a single report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const coverageDir = path.join(process.cwd(), 'coverage', 'playwright');
const nycOutputDir = path.join(process.cwd(), 'coverage');

console.log('Merging Playwright coverage reports...');

// Check if coverage directory exists
if (!fs.existsSync(coverageDir)) {
  console.log('No Playwright coverage directory found. Skipping merge.');
  process.exit(0);
}

// Find all coverage JSON files
const coverageFiles = fs.readdirSync(coverageDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.join(coverageDir, file));

if (coverageFiles.length === 0) {
  console.log('No coverage files found. Skipping merge.');
  process.exit(0);
}

console.log(`Found ${coverageFiles.length} coverage file(s)`);

// Merge coverage files using NYC
try {
  // Create a temporary merged coverage file
  const mergedCoverage = {};
  
  coverageFiles.forEach(file => {
    try {
      const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.assign(mergedCoverage, coverage);
    } catch (error) {
      console.warn(`Warning: Could not parse coverage file ${file}:`, error.message);
    }
  });

  // Write merged coverage
  const mergedFile = path.join(nycOutputDir, 'coverage-merged.json');
  fs.mkdirSync(nycOutputDir, { recursive: true });
  fs.writeFileSync(mergedFile, JSON.stringify(mergedCoverage, null, 2));

  console.log('Coverage merged successfully!');
  console.log(`Merged coverage file: ${mergedFile}`);
} catch (error) {
  console.error('Error merging coverage:', error);
  process.exit(1);
}


