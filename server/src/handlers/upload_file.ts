
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type UploadFileInput, type File } from '../schema';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Simple UUID v4 generator
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const uploadFile = async (input: UploadFileInput): Promise<File> => {
    try {
        const fileId = generateUUID();
        const uniqueUrl = crypto.randomBytes(16).toString('hex'); // Generate unique URL
        const fileExtension = path.extname(input.original_filename);
        const filename = `${fileId}${fileExtension}`;
        const filePath = path.join(process.cwd(), 'uploads', filename);
        
        // Create uploads directory if it doesn't exist
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        
        // Decode base64 and save file
        const fileBuffer = Buffer.from(input.file_data, 'base64');
        await fs.promises.writeFile(filePath, fileBuffer);
        
        // Save to database
        const result = await db.insert(filesTable)
            .values({
                id: fileId,
                filename,
                original_filename: input.original_filename,
                mimetype: input.mimetype,
                size: input.size,
                file_path: filePath,
                unique_url: uniqueUrl
            })
            .returning()
            .execute();
        
        return result[0];
    } catch (error) {
        console.error('File upload failed:', error);
        throw error;
    }
};
