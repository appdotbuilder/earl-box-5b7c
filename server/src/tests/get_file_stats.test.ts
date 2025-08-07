
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { getFileStats } from '../handlers/get_file_stats';

describe('getFileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no files exist', async () => {
    const result = await getFileStats();

    expect(result.total_files).toEqual(0);
    expect(result.total_size).toEqual(0);
  });

  it('should return correct stats for single file', async () => {
    // Insert test file
    await db.insert(filesTable).values({
      id: 'test-file-1',
      filename: 'test.txt',
      original_filename: 'original-test.txt',
      mimetype: 'text/plain',
      size: 1024,
      file_path: '/uploads/test.txt',
      unique_url: 'unique-url-1'
    }).execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(1);
    expect(result.total_size).toEqual(1024);
  });

  it('should return correct stats for multiple files', async () => {
    // Insert multiple test files
    await db.insert(filesTable).values([
      {
        id: 'test-file-1',
        filename: 'test1.txt',
        original_filename: 'original-test1.txt',
        mimetype: 'text/plain',
        size: 1024,
        file_path: '/uploads/test1.txt',
        unique_url: 'unique-url-1'
      },
      {
        id: 'test-file-2',
        filename: 'test2.jpg',
        original_filename: 'original-test2.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
        file_path: '/uploads/test2.jpg',
        unique_url: 'unique-url-2'
      },
      {
        id: 'test-file-3',
        filename: 'test3.pdf',
        original_filename: 'original-test3.pdf',
        mimetype: 'application/pdf',
        size: 4096,
        file_path: '/uploads/test3.pdf',
        unique_url: 'unique-url-3'
      }
    ]).execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(3);
    expect(result.total_size).toEqual(7168); // 1024 + 2048 + 4096
  });

  it('should handle large file sizes correctly', async () => {
    // Insert file with large size
    const largeSize = 100 * 1024 * 1024; // 100MB
    await db.insert(filesTable).values({
      id: 'large-file',
      filename: 'large.zip',
      original_filename: 'original-large.zip',
      mimetype: 'application/zip',
      size: largeSize,
      file_path: '/uploads/large.zip',
      unique_url: 'unique-url-large'
    }).execute();

    const result = await getFileStats();

    expect(result.total_files).toEqual(1);
    expect(result.total_size).toEqual(largeSize);
  });
});
