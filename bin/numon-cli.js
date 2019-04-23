#!/usr/bin/env node
'use strict';

const Module = require('module');
const numon = require('../index.js');

const options = process.numon.options = {
  inspector: {
    enable: false,
    settle: false,
    wait: false,
    port: 9229,
    host: '127.0.0.1',
  },
  watcher: {
    persistent: false,
  }
}

const args = process.argv.slice(2);
const unknownOptions = [];
let targetIndex = args.length - 1;

for (const argidx in args) {
  const arg = args[argidx];

  if (arg.charAt(0) === '-') {
    targetIndex = parseInt(argidx) + 1;

    let i = 1;
    for (; i < arg.length; i++) {
      const code = arg.charAt(i);
      switch (code) {
        case 'i': { options.inspector.enable = true; break; }
        case 's': { options.inspector.settle = true; break; }
        case 'w': { options.inspector.wait = true; break; }
        case 'r': { options.inspector.host = '0.0.0.0'; break; }
        case 'p': { options.watcher.persistent = true; break; }
        default: { unknownOptions.push(code); }
      }
    }
  }
  else {
    break;
  }
}

if (unknownOptions.length === 0 && args.length > 0 && targetIndex < args.length) {
  process.argv = process.argv.filter((e, i) => i < 1 || i > (targetIndex + 1));
  const target = require.resolve(`${process.cwd()}/${args[targetIndex]}`);
  
  if (options.inspector.enable === true) {
    process.execArgv.push('--inspect');
    process.execArgv.push('--debug');
    require('inspector').open(options.inspector.port, options.inspector.host, options.inspector.wait || options.inspector.settle);

    if (options.inspector.wait === true) {
      process.execArgv.push('--inspect-brk');
      process.execArgv.push('--debug-brk');
      debugger;
    }
  }

  const result = require(target);

  // handle package.json
  if (typeof result === 'object' && typeof result.main === 'string' && Module._cache[target] !== undefined) {
    Module._cache[target].require(`${process.cwd()}/${result.main}`);
  }
}
else if (unknownOptions.length > 0) {
  console.log(`Unknown options: ${unknownOptions.join('')}`);
}
else {
  console.log('Basic usage:');
  console.log('$ numon {-options} [index.js || . || package.json || package || index]');
  console.log('\nOptions:');
  console.log(' i - enable (I)nspector on localhost:' + options.inspector.port);
  console.log(' s - let inspector (S)ettle before main module loads');
  console.log(' w - (W)ait before main module loads');
  console.log(' r - open inspector for (R)emote connections (binding on 0.0.0.0)');
  console.log(' p - use (P)ersistent watchers for keep finite running modules restartable');
  console.log('\nExample:');
  console.log('$ numon -iswrp .');
}
