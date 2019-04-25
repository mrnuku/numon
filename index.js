'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');
const toposort = require('toposort');

//const isWindows = process.platform === 'win32';
//const color = require('npm/node_modules/ansicolors');

//exports.defaultCompile = false;
//exports.verbose = true;
//exports.keepHistory = true;

process.numon = {
  depedencies: {},
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
        const fileContentCache = {};
        let errorCount = 0;
        
        console.log(process.numon.batch);
        process.numon.batch = buildDepedencies(process.numon.batch);
        console.log(process.numon.batch);

        for (const moduleName of process.numon.batch) {
          const ext = path.extname(moduleName).toLowerCase();
          
          try {
            if (ext == '.js') {
              const content = stripShebang(readSync(moduleName, 'utf8')) + "";
              fileContentCache[moduleName] = content;
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
            }
          }
          catch(e) {
            console.log(`\nnumon: compilation failure in module: ${moduleName}\n`);
            console.log(e.message);
            console.log(e.name);
            console.log(e.stack);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          for (const moduleName of process.numon.batch) {
            const ext = path.extname(moduleName).toLowerCase();
            
            try {
              if (ext == '.js') {
                const content = fileContentCache[moduleName];
                delete fileContentCache[moduleName];
                const targetModule = Module._cache[moduleName];
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
        }
        
        process.numon.batch.length = 0;
      }, 50);
    }
  });
  
  process.numon.watchers[directory] = watcher;
};

Module._resolveFilename = function(request, parent, isMain, options) {
  const resolved = process.numon.originals['Module._resolveFilename'](request, parent, isMain, options);
  
  let parentDepedencies = process.numon.depedencies[parent.filename];
  if (parentDepedencies === undefined) {
    parentDepedencies = process.numon.depedencies[parent.filename] = {};
  }

  parentDepedencies[resolved] = true;
  
  const dir = path.dirname(resolved);
  
  if (process.numon.watchers[dir] === undefined) {
    registerWatcherForDirectory(dir);
  }
  
  return resolved;
}

const buildDepedenciesForParent = exports.buildDepedenciesForParent = (parent, filterChildren) => {
  let depedencies = process.numon.depedencies[parent];
  let children = depedencies !== undefined ? Object.keys(depedencies) : []; // handle node with no depedencies
  children = filterChildren !== null ? children.filter(e => filterChildren.indexOf(e) !== -1) : children;
  depedencies = children.map(e => [parent, e]);
  return depedencies;
}

const buildDepedencies = exports.buildDepedencies = (participants = Object.keys(process.numon.depedencies)) => {
  const depedencies = participants.map(e => buildDepedenciesForParent(e, participants)).flat(1);
  const sorted = depedencies.length > 1 ? toposort(depedencies) : participants;
  return sorted;
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
