
import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileByUrlInput, type File } from '../schema';
import { eq } from 'drizzle-orm';

export const getFileByUrl = async (input: GetFileByUrlInput): Promise<File | null> => {
  try {
    const result = await db.select()
      .from(filesTable)
      .where(eq(filesTable.unique_url, input.unique_url))
      .limit(1)
      .execute();
    
    return result[0] || null;
  } catch (error) {
    console.error('File retrieval by URL failed:', error);
    throw error;
  }
};
