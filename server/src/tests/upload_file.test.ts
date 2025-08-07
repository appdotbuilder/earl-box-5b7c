
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Test input with base64 encoded "Hello, World!" text
const testInput: UploadFileInput = {
    filename: 'test-file.txt',
    original_filename: 'original-test-file.txt',
    mimetype: 'text/plain',
    size: 13, // Length of "Hello, World!"
    file_data: Buffer.from('Hello, World!').toString('base64')
};

describe('uploadFile', () => {
    beforeEach(createDB);
    afterEach(async () => {
        // Clean up uploaded files
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try {
            const files = await fs.promises.readdir(uploadsDir);
            for (const file of files) {
                await fs.promises.unlink(path.join(uploadsDir, file));
            }
        } catch (error) {
            // Directory might not exist, which is fine
        }
        await resetDB();
    });

    it('should upload a file and save metadata', async () => {
        const result = await uploadFile(testInput);

        // Verify metadata
        expect(result.id).toBeDefined();
        expect(result.filename).toMatch(/\.txt$/);
        expect(result.original_filename).toBe('original-test-file.txt');
        expect(result.mimetype).toBe('text/plain');
        expect(result.size).toBe(13);
        expect(result.file_path).toContain('uploads');
        expect(result.unique_url).toBeDefined();
        expect(result.unique_url.length).toBeGreaterThan(0);
        expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save file to filesystem', async () => {
        const result = await uploadFile(testInput);

        // Verify file exists on disk
        expect(await fs.promises.access(result.file_path).then(() => true, () => false)).toBe(true);

        // Verify file content
        const fileContent = await fs.promises.readFile(result.file_path, 'utf8');
        expect(fileContent).toBe('Hello, World!');

        // Verify file size
        const stats = await fs.promises.stat(result.file_path);
        expect(stats.size).toBe(13);
    });

    it('should save metadata to database', async () => {
        const result = await uploadFile(testInput);

        // Query database to verify record was saved
        const files = await db.select()
            .from(filesTable)
            .where(eq(filesTable.id, result.id))
            .execute();

        expect(files).toHaveLength(1);
        const savedFile = files[0];
        expect(savedFile.filename).toBe(result.filename);
        expect(savedFile.original_filename).toBe('original-test-file.txt');
        expect(savedFile.mimetype).toBe('text/plain');
        expect(savedFile.size).toBe(13);
        expect(savedFile.unique_url).toBe(result.unique_url);
        expect(savedFile.created_at).toBeInstanceOf(Date);
    });

    it('should generate unique URLs for different uploads', async () => {
        const result1 = await uploadFile(testInput);
        const result2 = await uploadFile({
            ...testInput,
            original_filename: 'another-file.txt'
        });

        expect(result1.unique_url).not.toBe(result2.unique_url);
        expect(result1.id).not.toBe(result2.id);
        expect(result1.filename).not.toBe(result2.filename);
    });

    it('should handle different file types', async () => {
        const imageInput: UploadFileInput = {
            filename: 'test-image.png',
            original_filename: 'my-image.png',
            mimetype: 'image/png',
            size: 100,
            file_data: Buffer.from('fake-png-data').toString('base64')
        };

        const result = await uploadFile(imageInput);

        expect(result.filename).toMatch(/\.png$/);
        expect(result.mimetype).toBe('image/png');
        expect(result.original_filename).toBe('my-image.png');

        // Verify file was written
        const fileContent = await fs.promises.readFile(result.file_path);
        expect(fileContent.toString()).toBe('fake-png-data');
    });
});
