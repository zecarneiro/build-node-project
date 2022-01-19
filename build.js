#!/usr/bin/env node
/*
  Dependencies: npm i --save-dev yargs fs-extra webpack webpack-cli ts-loader
*/
'use strict';
const main = () => {
  var packages = {
    yargs: null,
    hideBin: null,
    fse: null,
    childProcess: null,
    path: null,
    os: null,
  };
  var isVerbose = false;

  /**
  * 
  * @param {any} msg 
  * @param {number} type 0 = log, 1 = info, 2 = warn, 3 = error
  */
  var printMessage = (msg, type, verbose) => {
    if (verbose && msg) {
      msg = `>  ${msg}`;
      if (type === 1) console.info(`INFO: ${msg}`);
      else if (type === 2) console.warn(`WARNNING: ${msg}`);
      else if (type === 3) console.error(`ERROR: ${msg}`);
      else console.log(msg);
    }
  };

  var exit = (status) => {
    printMessage(`STATUS CODE: ${status}`, 0, true);
    if (typeof status === 'string') {
      process.exit(1);
    }
    process.exit(status);
  };

  var getTempFileDir = (name) => {
    return packages.path.resolve(packages.os.tmpdir(), name);
  }

  var objToString = (data) => {
    return JSON.stringify(data, null, 4);
  }

  var writeFile = (name, data) => {
    data = typeof data === 'string' ? data : objToString(data);
    packages.fse.writeFileSync(packages.path.resolve(name), data, { encoding: 'utf8', flag: 'w' });
  }

  try {
    packages.yargs = require('yargs/yargs');
    packages.hideBin = require('yargs/helpers').hideBin;
    packages.fse = require('fs-extra');
    packages.childProcess = require('child_process');
    packages.path = require('path');
    packages.os = require('os');
  } catch (error) {
    printMessage('Dependencies packages: \"yargs fs-extra webpack webpack-cli ts-loader\"', 3, true);
    exit(1);
  }

  const BIN_PATH = packages.path.resolve(__dirname, '..', 'dist');
  const BIN_NAME = 'index.js';
  const EXCLUDE_RULE = [packages.path.resolve(__dirname, '..', 'node_modules')];
  const EXTENSIONS = ['ts', 'js'];

  var exeCmd = (cmd, args, verbose) => {
    let argsStr = '';
    args.forEach(arg => {
      argsStr += arg + ' ';
    });
    printMessage(`Execute: ${cmd} ${argsStr}`, 1, verbose);
    const options = { stdio: 'inherit', shell: true };
    const res = packages.childProcess.spawnSync(cmd, args, options);
    if (res.status !== 0) {
      exit(res.status);
    }
  };

  var getWebpackConfig = (mode, entryPoint, binPath, binName, excludeRule, extensions, loader) => {
    binPath = !binPath ? BIN_PATH : binPath;
    binName = !binName ? BIN_NAME : binName;
    excludeRule = !excludeRule ? EXCLUDE_RULE : excludeRule;
    extensions = !extensions ? EXTENSIONS.map(ext => '.' + ext) : extensions.map(ext => '.' + ext);
    loader = !loader ? 'ts-loader' : loader;
    const fileName = getTempFileDir('webpack.config.js');
    const config = {
      target: 'node',
      mode: mode,
      entry: packages.path.resolve(__dirname, '..', entryPoint),
      output: {
        path: binPath,
        filename: binName,
        libraryTarget: 'commonjs2'
      },
      devtool: 'source-map',
      externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
      },
      resolve: {
        extensions: extensions
      },
      module: {
        rules: [
          {
            exclude: excludeRule,
            use: [
              {
                loader: loader
              }
            ]
          }
        ]
      }
    };
    writeFile(fileName, `module.exports = ${objToString(config)}`);
    return ['webpack', '--progress', '--config', fileName];
  }

  var cleanBin = (binPath) => {
    binPath = binPath ? binPath : BIN_PATH;
    if (packages.fse.existsSync(binPath)) {
      printMessage('Clean dist directory', 1, true);
      packages.fse.rmdirSync(binPath, { recursive: true });
    }
  };

  var lintFix = (fixPath, ext, verbose) => {
    if (fixPath) {
      fixPath = packages.path.resolve(__dirname, '..', fixPath);
      exeCmd('npx', ['eslint', fixPath, `--ext ${ext ? ext.toString() : EXTENSIONS.toString()}`, '"--fix"'], verbose);
    }
  }

  packages.yargs(packages.hideBin(process.argv))
    .command('build <mode> <entryPoint>', 'Build project', (args) => {
      return args.positional('mode', {
        describe: 'Type of build',
        choices: ['production', 'development'],
      }).option('excludeRule', { type: 'array',  });
    }, (argv) => {
      cleanBin(argv.binPath);
      lintFix(argv.lintFix, null, argv.verbose);
      if (argv.mode === 'production' || argv.mode === 'development') {
        printMessage(`Build ${argv.mode} mode`, 1, true);
        exeCmd('npx', getWebpackConfig(argv.mode, argv.entryPoint, argv.binPath, argv.binName, argv.rule, argv.extensions), argv.verbose);
      } else {
        printMessage('Invalid Option', 3, true);
      }
    })
    .command('build-ts <configs...>', 'Build typescripts project', (args) => {
      return args.option('configs', { demand: true }).option('lint-fix', {
        type: 'string',
        description: 'Source to lint. Default = ./'
      });
    }, (argv) => {
      let configFiles = [];
      cleanBin(argv.binPath);
      lintFix(argv.lintFix, null, argv.verbose);
      printMessage('Build typescript mode', 1, true);
      if (argv.configs) {
        argv.configs.forEach(entry => {
          configFiles.push(entry);
        });
      } else {
        configFiles.push('./');
      }
      configFiles.forEach(arg => exeCmd('tsc', ['-p', arg], argv.verbose));
    }).command('clean [binPath]', 'Clean bin path directory', (args) => {
      return args.option('binPath', { type: 'string' });
    }, (argv) => {
      cleanBin(argv.binPath);
    }).option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging',
    }).option('binPath', {
      type: 'string',
      description: 'Binary path. Default = ' + BIN_PATH
    }).option('binName', {
      type: 'string',
      description: 'Binary file name. Default = ' + BIN_NAME
    }).option('extensions', {
      type: 'array',
      description: 'List of extensions. Default = ' + EXTENSIONS.toString().split(',').join(' ')
    }).strict().parse();
}
main();
