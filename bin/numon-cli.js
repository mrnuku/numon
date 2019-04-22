#!/usr/bin/env node
'use strict';

const numon = require('../index.js');
const Module = require('module');

require('inspector').open(9229, '0.0.0.0', true);

const target = require.resolve(`${process.cwd()}/${process.argv[process.argv.length - 1]}`);
const result = require(target);

// handle package.json
if (typeof result === 'object' && typeof result.main === 'string' && Module._cache[target] !== undefined) {
  Module._cache[target].require(`${process.cwd()}/${result.main}`);
}
