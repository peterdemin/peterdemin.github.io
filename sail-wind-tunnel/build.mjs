import {readFile, writeFile} from 'node:fs/promises';

const directory = new URL('./', import.meta.url);
const physics = (await readFile(new URL('physics.mjs', directory), 'utf8')).replace(/^export (?=(?:const|function|class)\b)/gm, '');
const application = (await readFile(new URL('main.mjs', directory), 'utf8')).replace(/^import [^\n]+from '\.\/physics\.mjs';\n/, '');
if (/^import\b|^export\b/m.test(physics + application)) throw new Error('Unsupported module syntax: update the local bundle builder');
await writeFile(new URL('bundle.js', directory), `(function () {\n'use strict';\n${physics}\n${application}\n})();\n`);
console.log('Built bundle.js for HTTP and direct-file startup');
