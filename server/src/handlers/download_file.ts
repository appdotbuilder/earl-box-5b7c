
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByUrlInput, type FileDownload } from '../schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

export const downloadFile = async (input: GetFileByUrlInput): Promise<FileDownload | null> => {
  try {
    // Get file metadata from database
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.unique_url, input.unique_url))
      .limit(1)
      .execute();
    
    if (files.length === 0) {
      return null;
    }
    
    const file = files[0];
    
    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      console.error('File not found on disk:', file.file_path);
      return null;
    }
    
    // Read file from disk and encode to base64
    const fileBuffer = await fs.promises.readFile(file.file_path);
    const fileData = fileBuffer.toString('base64');
    
    return {
      id: file.id,
      filename: file.filename,
      original_filename: file.original_filename,
      mimetype: file.mimetype,
      size: file.size,
      file_data: fileData,
      created_at: file.created_at
    };
  } catch (error) {
    console.error('File download failed:', error);
    throw error;
  }
};
