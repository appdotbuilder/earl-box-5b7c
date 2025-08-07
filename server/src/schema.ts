
import { z } from 'zod';

// File upload schema
export const fileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  original_filename: z.string(),
  mimetype: z.string(),
  size: z.number().int(),
  file_path: z.string(),
  unique_url: z.string(),
  created_at: z.coerce.date()
});

export type File = z.infer<typeof fileSchema>;

// Input schema for uploading files
export const uploadFileInputSchema = z.object({
  filename: z.string().min(1),
  original_filename: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().min(1).max(200 * 1024 * 1024), // 200MB limit
  file_data: z.string() // Base64 encoded file data
});

export type UploadFileInput = z.infer<typeof uploadFileInputSchema>;

// Schema for file retrieval by unique URL
export const getFileByUrlInputSchema = z.object({
  unique_url: z.string().min(1)
});

export type GetFileByUrlInput = z.infer<typeof getFileByUrlInputSchema>;

// Schema for file statistics
export const fileStatsSchema = z.object({
  total_files: z.number().int(),
  total_size: z.number().int()
});

export type FileStats = z.infer<typeof fileStatsSchema>;

// Schema for file download response
export const fileDownloadSchema = z.object({
  id: z.string(),
  filename: z.string(),
  original_filename: z.string(),
  mimetype: z.string(),
  size: z.number().int(),
  file_data: z.string(), // Base64 encoded file data
  created_at: z.coerce.date()
});

export type FileDownload = z.infer<typeof fileDownloadSchema>;
