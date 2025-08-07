
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByUrlInput } from '../schema';
import { getFileByUrl } from '../handlers/get_file_by_url';

describe('getFileByUrl', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return file when unique URL exists', async () => {
    // Create test file
    const testFile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      filename: 'test-file.jpg',
      original_filename: 'original-test-file.jpg',
      mimetype: 'image/jpeg',
      size: 12345,
      file_path: '/uploads/test-file.jpg',
      unique_url: 'abc123def456'
    };

    await db.insert(filesTable)
      .values(testFile)
      .execute();

    const input: GetFileByUrlInput = {
      unique_url: 'abc123def456'
    };

    const result = await getFileByUrl(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('123e4567-e89b-12d3-a456-426614174000');
    expect(result!.filename).toEqual('test-file.jpg');
    expect(result!.original_filename).toEqual('original-test-file.jpg');
    expect(result!.mimetype).toEqual('image/jpeg');
    expect(result!.size).toEqual(12345);
    expect(result!.file_path).toEqual('/uploads/test-file.jpg');
    expect(result!.unique_url).toEqual('abc123def456');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when unique URL does not exist', async () => {
    const input: GetFileByUrlInput = {
      unique_url: 'nonexistent-url'
    };

    const result = await getFileByUrl(input);

    expect(result).toBeNull();
  });

  it('should return correct file when multiple files exist', async () => {
    // Create multiple test files
    const testFiles = [
      {
        id: '111e1111-e11b-11d3-a111-111111111111',
        filename: 'file1.jpg',
        original_filename: 'original-file1.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
        file_path: '/uploads/file1.jpg',
        unique_url: 'url1'
      },
      {
        id: '222e2222-e22b-22d3-a222-222222222222',
        filename: 'file2.pdf',
        original_filename: 'original-file2.pdf',
        mimetype: 'application/pdf',
        size: 2000,
        file_path: '/uploads/file2.pdf',
        unique_url: 'url2'
      }
    ];

    for (const file of testFiles) {
      await db.insert(filesTable)
        .values(file)
        .execute();
    }

    const input: GetFileByUrlInput = {
      unique_url: 'url2'
    };

    const result = await getFileByUrl(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('222e2222-e22b-22d3-a222-222222222222');
    expect(result!.filename).toEqual('file2.pdf');
    expect(result!.mimetype).toEqual('application/pdf');
    expect(result!.unique_url).toEqual('url2');
  });
});
