#!/usr/bin/env node

'use strict';

import { resolve, join } from 'path';
import minimist from 'minimist';
import { getAWSConfig } from '../lib/aws';
import { deploy } from '../lib/deployer';
import { format } from '../lib/console';
import { showErrorAndExit } from '../lib/error';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'stage',
    'role',
    'environment',
    'env',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let inputDir = argv['input-dir'] || argv._[0];
if (!inputDir) {
  showErrorAndExit('\'input-dir\' parameter is missing');
}
inputDir = resolve(process.cwd(), inputDir);

const pkg = require(join(inputDir, 'package.json'));
const { name, version } = pkg;
const entryFile = join(inputDir, pkg.main || 'index.js');

const stage = argv.stage || 'development';

const role = argv.role;

let env = argv.environment || argv.env;
if (env == null) {
  env = [];
} else if (typeof env === 'string') {
  env = [env];
}
const environment = {};
for (const item of env) {
  const [key, value, ...rest] = item.split('=');
  if (!key || !value || rest.length) {
    showErrorAndExit(`'environment' parameter is invalid (${item})`);
  }
  environment[key] = value;
}

const awsConfig = getAWSConfig(argv);

(async function() {
  const apiURL = await deploy({
    name, version, stage, entryFile, role, environment, awsConfig
  });
  console.log(format({ status: 'success', name, stage, message: 'Deployment completed', info: apiURL }));
})().catch(showErrorAndExit);
