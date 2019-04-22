# numon

the interactive node modules hotloader

this tool is a monitor for file changes and hot reload with a difference

files what you change will be precompiled, so any syntax errors
or code what executes in the global scope of that file, will be reported,
while you have the chance to fix them without restarting

sure this means that only the changed files will reload...

## Usage

install with npm

```console
$ npm i -g numon
```

go to your project in console and run with

```console
$ numon [index.js || . || package.json || package || index]
```
