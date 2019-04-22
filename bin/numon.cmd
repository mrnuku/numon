:: Created by npm, please don't edit manually.
@ECHO OFF

SETLOCAL

SET "NODE_EXE=%~dp0\node.exe"
IF NOT EXIST "%NODE_EXE%" (
  SET "NODE_EXE=node"
)

SET "NUMON_CLI_JS=%~dp0\node_modules\numon\bin\numon-cli.js"
FOR /F "delims=" %%F IN ('CALL "%NODE_EXE%" "%NUMON_CLI_JS%" prefix -g') DO (
  SET "NUMON_PREFIX_NUMON_CLI_JS=%%F\node_modules\numon\bin\numon-cli.js"
)
IF EXIST "%NUMON_PREFIX_NUMON_CLI_JS%" (
  SET "NUMON_CLI_JS=%NUMON_PREFIX_NUMON_CLI_JS%"
)

"%NODE_EXE%" "%NUMON_CLI_JS%" %*
