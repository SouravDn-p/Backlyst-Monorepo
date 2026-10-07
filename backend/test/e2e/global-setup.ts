import {
  mkdirSync,
  createWriteStream,
  readFileSync,
  type WriteStream,
} from 'node:fs';
import { request as httpRequest } from 'node:http';
import { dirname, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

import type { FullConfig } from '@playwright/test';

import { resetAndSeedMarketplaceE2E } from '../reset-marketplace-e2e';

const SERVER_LOG_PATH = resolve('test-results/marketplace-backend.log');

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

function resolveBackendUrl(config: FullConfig): string {
  const apiProject = config.projects.find((project) => project.name === 'api');

  const configuredBaseUrl = apiProject?.use.baseURL;

  if (typeof configuredBaseUrl === 'string') {
    return configuredBaseUrl;
  }

  return process.env.BACKEND_URL ?? 'http://localhost:5001';
}

async function isBackendReachable(backendUrl: string): Promise<boolean> {
  const target = new URL('/', backendUrl);

  return new Promise((resolvePromise) => {
    const request = httpRequest(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'GET',
        timeout: 1000,
      },
      (response) => {
        response.resume();
        resolvePromise(true);
      },
    );

    request.on('timeout', () => {
      request.destroy();
      resolvePromise(false);
    });

    request.on('error', () => {
      resolvePromise(false);
    });

    request.end();
  });
}

async function waitForBackend(
  backend: ChildProcess,
  backendUrl: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    if (await isBackendReachable(backendUrl)) {
      console.log(`PLAYWRIGHT_BACKEND_READY=${backendUrl}`);
      return;
    }

    if (backend.exitCode !== null) {
      throw new Error(
        `Marketplace backend exited before becoming ready. Exit code: ${backend.exitCode}`,
      );
    }

    await sleep(500);
  }

  throw new Error(
    `Marketplace backend did not become ready at ${backendUrl} within 60 seconds.`,
  );
}

function hasBackendExited(backend: ChildProcess): boolean {
  return backend.exitCode !== null || backend.signalCode !== null;
}

async function waitForBackendExit(
  backend: ChildProcess,
  timeoutMilliseconds: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMilliseconds;

  while (!hasBackendExited(backend)) {
    if (Date.now() >= deadline) {
      return false;
    }

    await sleep(25);
  }

  return true;
}

async function stopBackend(backend: ChildProcess): Promise<void> {
  if (hasBackendExited(backend)) {
    return;
  }

  backend.kill('SIGTERM');

  if (await waitForBackendExit(backend, 5000)) {
    return;
  }

  backend.kill('SIGKILL');

  if (!(await waitForBackendExit(backend, 5000))) {
    throw new Error(
      `Marketplace backend process ${backend.pid ?? 'unknown'} did not terminate.`,
    );
  }
}

async function closeLogStream(logStream: WriteStream): Promise<void> {
  if (logStream.closed || logStream.destroyed || logStream.writableFinished) {
    return;
  }

  logStream.end();

  const deadline = Date.now() + 5000;

  while (
    !logStream.closed &&
    !logStream.destroyed &&
    !logStream.writableFinished
  ) {
    if (Date.now() >= deadline) {
      logStream.destroy();

      throw new Error(
        'Marketplace backend log stream did not close within 5 seconds.',
      );
    }

    await sleep(25);
  }
}

function readBackendLog(): string {
  try {
    return readFileSync(SERVER_LOG_PATH, 'utf-8');
  } catch {
    return 'Backend log could not be read.';
  }
}

export default async function marketplaceGlobalSetup(
  config: FullConfig,
): Promise<() => Promise<void>> {
  console.log('PLAYWRIGHT_GLOBAL_SETUP=STARTED');

  const backendUrl = resolveBackendUrl(config);
  const parsedBackendUrl = new URL(backendUrl);

  if (parsedBackendUrl.protocol !== 'http:') {
    throw new Error(
      `E2E backend must use HTTP locally, received "${parsedBackendUrl.protocol}".`,
    );
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(parsedBackendUrl.hostname)) {
    throw new Error(
      `E2E backend must use an approved local host, received "${parsedBackendUrl.hostname}".`,
    );
  }

  if (await isBackendReachable(backendUrl)) {
    throw new Error(
      `E2E backend startup refused: ${backendUrl} is already serving requests. Stop the existing server first.`,
    );
  }

  await resetAndSeedMarketplaceE2E();

  mkdirSync(dirname(SERVER_LOG_PATH), {
    recursive: true,
  });

  const logStream = createWriteStream(SERVER_LOG_PATH, {
    flags: 'w',
  });

  const port = parsedBackendUrl.port || '5001';

  const backend = spawn(
    process.execPath,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'src/main.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: port,
        BACKEND_URL: backendUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  backend.stdout.pipe(logStream, {
    end: false,
  });

  backend.stderr.pipe(logStream, {
    end: false,
  });

  try {
    await waitForBackend(backend, backendUrl);
  } catch (error) {
    await stopBackend(backend);
    await closeLogStream(logStream);

    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        '',
        '=== MARKETPLACE BACKEND LOG ===',
        readBackendLog(),
      ].join('\n'),
    );
  }

  console.log(`PLAYWRIGHT_BACKEND_PID=${backend.pid}`);
  console.log('PLAYWRIGHT_GLOBAL_SETUP=PASS');

  return async (): Promise<void> => {
    console.log('PLAYWRIGHT_GLOBAL_TEARDOWN=STARTED');

    await stopBackend(backend);
    await closeLogStream(logStream);

    console.log('PLAYWRIGHT_BACKEND_STOPPED=PASS');
    console.log('PLAYWRIGHT_GLOBAL_TEARDOWN=PASS');
  };
}
