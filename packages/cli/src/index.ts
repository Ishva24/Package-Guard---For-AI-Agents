#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { inspectPackage } from '@packageguard/core';
import type { Ecosystem } from '@packageguard/core';

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0]; // e.g. "npm" or "pip"
const subCommand = args[1]; // e.g. "install", "add", etc.

if (!command || !subCommand) {
  console.log('Usage: packageguard <npm|pip> <install|add|...> [packages...]');
  process.exit(0);
}

if (command !== 'npm' && command !== 'pip') {
  console.error(`[PackageGuard] Unsupported package manager: "${command}". Use npm or pip.`);
  process.exit(2);
}

// Map command to ecosystem
const ecosystem: Ecosystem = command === 'pip' ? 'pypi' : 'npm';

// Extract package names from install arguments
// We need to parse things like: npm install lodash express --save-dev
// Or: pip install requests numpy
const isInstall = ['install', 'i', 'add', 'get'].includes(subCommand.toLowerCase());

if (!isInstall) {
  // Not an installation command, forward directly
  forwardCommand(command, args.slice(1));
} else {
  // Parse package names
  const packageArgs = args.slice(2);
  const packagesToInspect: string[] = [];
  for (const arg of packageArgs) {
    if (arg.startsWith('-')) {
      continue;
    } else {
      // Remove version specifiers for analysis (e.g. lodash@4.17.21 or requests>=2.25.1)
      let cleanPkg = arg;
      if (ecosystem === 'npm') {
        // Handle scoped packages e.g. @types/node@18.0.0
        if (arg.startsWith('@')) {
          const parts = arg.slice(1).split('@');
          cleanPkg = '@' + parts[0];
        } else {
          cleanPkg = arg.split('@')[0];
        }
      } else {
        // pip split on ==, >=, <=, >, <, ~=
        cleanPkg = arg.split(/[=><~]/)[0];
      }
      if (cleanPkg.trim()) {
        packagesToInspect.push(cleanPkg.trim());
      }
    }
  }

  if (packagesToInspect.length === 0) {
    forwardCommand(command, args.slice(1));
  } else {
    runInspectionAndMaybeForward(command, packagesToInspect, args.slice(1));
  }
}

async function runInspectionAndMaybeForward(
  cmd: string,
  packages: string[],
  originalArgs: string[]
) {
  console.log(`\n🛡️  [PackageGuard] Checking ${packages.length} package(s) on ${ecosystem === 'pypi' ? 'PyPI' : 'npm'} before installation...`);

  let blockedAny = false;
  const warnings: string[] = [];

  for (const pkg of packages) {
    try {
      const result = await inspectPackage({
        ecosystem,
        packageName: pkg,
        requestedBy: 'CLI'
      });

      if (result.decision === 'BLOCK') {
        blockedAny = true;
        console.error(`\n🚫 [PackageGuard] BLOCKED: "${pkg}"`);
        result.reasons.forEach((r: string) => console.error(`   • ${r}`));
      } else if (result.decision === 'WARN') {
        warnings.push(pkg);
        console.warn(`\n⚠️  [PackageGuard] WARNING: "${pkg}"`);
        result.reasons.forEach((r: string) => console.warn(`   • ${r}`));
      }
    } catch (err) {
      console.error(`❌ [PackageGuard] Error inspecting "${pkg}":`, err);
    }
  }

  if (blockedAny) {
    console.error('\n❌ [PackageGuard] Installation aborted! Hallucinated or highly suspicious packages detected.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  [PackageGuard] Proceeding with warnings. Press Ctrl+C in 3 seconds to abort...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    console.log('\n✅ [PackageGuard] All packages cleared for installation.');
  }

  // Forward the exact installation arguments. The normalized package names above
  // are only for inspection; reconstructing them could drop version pins.
  forwardCommand(cmd, originalArgs);
}

function forwardCommand(bin: string, forwardArgs: string[]) {
  // Never invoke a shell: package names and flags are untrusted command input.
  // On Windows, npm.cmd requires a shell, so execute npm's JS entrypoint through
  // the current Node runtime instead.
  const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const useNodeForNpm = process.platform === 'win32' && bin === 'npm' && existsSync(npmCli);
  const executable = useNodeForNpm ? process.execPath : bin;
  const args = useNodeForNpm ? [npmCli, ...forwardArgs] : forwardArgs;
  const child = spawn(executable, args, {
    stdio: 'inherit',
    shell: false
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}
