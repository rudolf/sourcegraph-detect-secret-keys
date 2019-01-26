import fs from 'fs';
import test from 'tape';
import {detectSecrets} from '../lib/detectSecrets';

const fixtures = fs.readFileSync('./tests/fixtures.txt').toString().split(';\n').map(f => f.split(': '));

console.log(fs.readFileSync('./tests/fixtures.txt').toString().match(/(["'`])(?:\\?.)*?\1/g))

fixtures.map(([description, value]) => {
    test('Matches secret in ' + description, t => {
        t.equal(detectSecrets(value).length > 0, true, 'expected to find a secret in: ' + value);
        t.end();
    });
});
