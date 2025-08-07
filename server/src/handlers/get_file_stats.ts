
import { db } from '../db';
import { filesTable } from '../db/schema';
import { count, sum } from 'drizzle-orm';
import { type FileStats } from '../schema';

export const getFileStats = async (): Promise<FileStats> => {
  try {
    const stats = await db.select({
      total_files: count(filesTable.id),
      total_size: sum(filesTable.size)
    })
    .from(filesTable)
    .execute();

    return {
      total_files: stats[0]?.total_files || 0,
      total_size: Number(stats[0]?.total_size || 0)
    };
  } catch (error) {
    console.error('File stats retrieval failed:', error);
    throw error;
  }
};
