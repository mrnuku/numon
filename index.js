'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

//const isWindows = process.platform === 'win32';
//const color = require('npm/node_modules/ansicolors');

//exports.defaultCompile = false;
//exports.verbose = true;
//exports.keepHistory = true;

process.numon = {
  //depedencies: [],
  watchers: {},
  batch: [],
  batchTimer: null,
  originals: {},
};

process.numon.originals['Module._resolveFilename'] = Module._resolveFilename;

const registerWatcherForDirectory = (directory) => {
  const watcher = fs.watch(directory, { persistent: process.numon.options.watcher.persistent, encoding: 'utf8' }, (eventType, filename) => {
    const moduleName = `${directory}/${filename}`;
    
    if (Module._cache[moduleName] !== undefined && process.numon.batch.find(e => e === moduleName) === undefined) {
      process.numon.batch.push(moduleName);
    }
    
    if (process.numon.batchTimer === null) {
      process.numon.batchTimer = setTimeout(() => {
        process.numon.batchTimer = null;
        
        console.log(process.numon.batch);
        
        for (const moduleName of process.numon.batch) {
          const ext = path.extname(moduleName).toLowerCase();
          
          try {
            if (ext == '.js') {
              const content = stripShebang(readSync(moduleName, 'utf8')) + "";
              const script = new vm.Script(Module.wrap(content), { displayErrors: true, filename: moduleName });
              const targetModule = Module._cache[moduleName];
              const dummyModule = {
                children:[],
                exports: {},
                filename: targetModule.filename,
                id: targetModule.id,
                loaded: false,
                parent: null,
                paths: [],
                require: (r) => targetModule.require(r)
              }
              script.runInNewContext().call({}, dummyModule.exports, dummyModule.require, dummyModule, moduleName, path.dirname(moduleName));
              targetModule._compile(content, moduleName);
            }
            else {
              Module._extensions[ext](Module._cache[moduleName], moduleName);
            }
          }
          catch(e) {
            console.log(`\nnumon: compilation failure in module: ${moduleName}\n`);
            console.log(e.message);
            console.log(e.name);
            console.log(e.stack);
          }
        }
        
        process.numon.batch.length = 0;
      }, 50);
    }
  });
  
  process.numon.watchers[directory] = watcher;
};

Module._resolveFilename = function(request, parent, isMain, options) {
  const resolved = process.numon.originals['Module._resolveFilename'](request, parent, isMain, options);
  
  /*if (process.numon.depedencies.find(e => e[0] === parent.filename && e[1] === resolved) === undefined) {
    process.numon.depedencies.push([parent.filename, resolved]);
  }*/
  
  const dir = path.dirname(resolved);
  
  if (process.numon.watchers[dir] === undefined) {
    registerWatcherForDirectory(dir);
  }
  
  return resolved;
}

const readSync = (filename, options) => {
  const fd = fs.openSync(filename, 'r');
  const fstat = fs.fstatSync(fd);
  const buffer = Buffer.allocUnsafe(fstat.size);
  buffer.charCodeAt = (i) => buffer[i]; // <- hope this compatibility hax will be the one and only
  
  if (fs.readSync(fd, buffer, 0, fstat.size, 0) != fstat.size) {
    console.log(`numon: faulty read in module: ${filename}`);
  }
  
  fs.closeSync(fd);
  return buffer;
}

function stripShebang(content, offs = 0) {
  const CHAR_HASH = 35;
  const CHAR_EXCLAMATION_MARK = 33;
  const CHAR_LINE_FEED = 10;
  const CHAR_CARRIAGE_RETURN = 13;

  // Remove shebang
  var contLen = content.length - offs;
  if (contLen >= 2) {
    if (content.charCodeAt(offs + 0) === CHAR_HASH &&
        content.charCodeAt(offs + 1) === CHAR_EXCLAMATION_MARK) {
      if (contLen === 2) {
        // Exact match
        content = '';
      } else {
        // Find end of shebang line and slice it off
        var i = 2;
        for (; i < contLen; ++i) {
          var code = content.charCodeAt(offs + i);
          if (code === CHAR_LINE_FEED || code === CHAR_CARRIAGE_RETURN)
            break;
        }
        if (i === contLen)
          content = '';
        else {
          // Note that this actually includes the newline character(s) in the
          // new output. This duplicates the behavior of the regular expression
          // that was previously used to replace the shebang line
          content = content.slice(i);
        }
      }
    }
  }
  
  return content;
}
