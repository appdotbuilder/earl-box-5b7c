
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByUrlInput } from '../schema';
import { downloadFile } from '../handlers/download_file';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const testInput: GetFileByUrlInput = {
  unique_url: 'test-unique-url-123'
};

describe('downloadFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should download file with metadata and base64 data', async () => {
    // Create test file on disk
    const testDir = '/tmp/test-files';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-file.txt');
    const testFileContent = 'Hello, this is test file content!';
    await fs.promises.writeFile(testFilePath, testFileContent);
    
    // Insert file record
    await db.insert(filesTable)
      .values({
        id: 'test-file-id',
        filename: 'test-file.txt',
        original_filename: 'original-test-file.txt',
        mimetype: 'text/plain',
        size: testFileContent.length,
        file_path: testFilePath,
        unique_url: 'test-unique-url-123'
      })
      .execute();

    const result = await downloadFile(testInput);

    // Verify file metadata
    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test-file-id');
    expect(result!.filename).toEqual('test-file.txt');
    expect(result!.original_filename).toEqual('original-test-file.txt');
    expect(result!.mimetype).toEqual('text/plain');
    expect(result!.size).toEqual(testFileContent.length);
    expect(result!.created_at).toBeInstanceOf(Date);
    
    // Verify base64 encoded file data
    expect(result!.file_data).toBeDefined();
    const decodedContent = Buffer.from(result!.file_data, 'base64').toString('utf8');
    expect(decodedContent).toEqual(testFileContent);
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    fs.rmdirSync(testDir);
  });

  it('should return null for non-existent unique URL', async () => {
    const result = await downloadFile({ unique_url: 'non-existent-url' });
    
    expect(result).toBeNull();
  });

  it('should return null if file exists in database but not on disk', async () => {
    // Insert file record with non-existent file path
    await db.insert(filesTable)
      .values({
        id: 'missing-file-id',
        filename: 'missing-file.txt',
        original_filename: 'missing-original.txt',
        mimetype: 'text/plain',
        size: 100,
        file_path: '/non/existent/path/file.txt',
        unique_url: 'test-unique-url-123'
      })
      .execute();

    const result = await downloadFile(testInput);
    
    expect(result).toBeNull();
  });

  it('should handle binary files correctly', async () => {
    // Create test binary file
    const testDir = '/tmp/test-files';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-binary.bin');
    const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
    await fs.promises.writeFile(testFilePath, binaryData);
    
    // Insert file record
    await db.insert(filesTable)
      .values({
        id: 'binary-file-id',
        filename: 'test-binary.bin',
        original_filename: 'original-binary.bin',
        mimetype: 'application/octet-stream',
        size: binaryData.length,
        file_path: testFilePath,
        unique_url: 'test-unique-url-123'
      })
      .execute();

    const result = await downloadFile(testInput);

    expect(result).not.toBeNull();
    expect(result!.mimetype).toEqual('application/octet-stream');
    
    // Verify binary data integrity
    const decodedData = Buffer.from(result!.file_data, 'base64');
    expect(decodedData.equals(binaryData)).toBe(true);
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    fs.rmdirSync(testDir);
  });
});
