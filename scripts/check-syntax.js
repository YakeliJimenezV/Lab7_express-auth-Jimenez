import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function check(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) check(file);
        else if (file.endsWith('.js')) {
            const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit', windowsHide: true });
            if (result.error || result.status !== 0) process.exit(1);
        }
    }
}
for (const dir of ['src', 'public/js', 'scripts', 'test']) check(dir);
console.log('Sintaxis JavaScript correcta');
