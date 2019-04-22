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
$ numon {-options} [index.js || . || package.json || package || index]
```

## Options

* i - enable (I)nspector on localhost:9229
* s - let inspector (S)ettle before main module loads
* w - (W)ait before main module loads
* r - open inspector for (R)emote connections (binding on 0.0.0.0)
* p - use (P)ersistent watchers for keep finite running modules restartable

## Example

```console
$ numon -iswrp .
```
