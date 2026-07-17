import './setup.js';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveSafeLocalPath } from '../src/modules/media/localStorage.service.js';

describe('local media path safety', () => {
  let tempRoot = '';

  afterEach(async () => {
    tempRoot = '';
  });

  async function makeRoot() {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'union-media-'));
    await mkdir(path.join(tempRoot, 'photos'), { recursive: true });
    await writeFile(path.join(tempRoot, 'photos', 'a.jpg'), 'jpeg');
    return tempRoot;
  }

  it('allows keys under the storage root', async () => {
    const root = await makeRoot();
    expect(resolveSafeLocalPath('photos/a.jpg', root)).toBe(path.resolve(root, 'photos/a.jpg'));
  });

  it('rejects path traversal outside the storage root', async () => {
    const root = await makeRoot();
    expect(resolveSafeLocalPath('../outside.jpg', root)).toBeNull();
    expect(resolveSafeLocalPath('photos/../../outside.jpg', root)).toBeNull();
    expect(resolveSafeLocalPath('..\\outside.jpg', root)).toBeNull();
  });

  it('rejects absolute paths and null bytes', async () => {
    const root = await makeRoot();
    expect(resolveSafeLocalPath('/etc/passwd', root)).toBeNull();
    expect(resolveSafeLocalPath('photos/a\0.jpg', root)).toBeNull();
  });
});
