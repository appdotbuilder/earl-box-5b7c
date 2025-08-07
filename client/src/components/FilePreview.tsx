
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Download, ArrowLeft, Eye, FileImage, Video } from 'lucide-react';
// Use type-only import with alias to avoid conflict with browser File type
import type { File as FileRecord } from '../../../server/src/schema';

interface FilePreviewProps {
  uniqueUrl: string;
  onBack?: () => void;
}

export function FilePreview({ uniqueUrl, onBack }: FilePreviewProps) {
  const [fileRecord, setFileRecord] = useState<FileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (mimetype.startsWith('video/')) return <Video className="h-5 w-5" />;
    return <FileImage className="h-5 w-5" />;
  };

  const loadFile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fileData = await trpc.getFileByUrl.query({ unique_url: uniqueUrl });
      
      if (!fileData) {
        setError('File not found or no longer available');
        return;
      }

      setFileRecord(fileData);

      // Load file data for preview
      const downloadData = await trpc.downloadFile.query({ unique_url: uniqueUrl });
      if (downloadData) {
        const byteCharacters = atob(downloadData.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: downloadData.mimetype });
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      }

    } catch (error) {
      console.error('Failed to load file:', error);
      setError('Failed to load file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uniqueUrl]);

  useEffect(() => {
    loadFile();

    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [loadFile, previewUrl]);

  const handleDownload = async () => {
    if (!fileRecord) return;

    try {
      const fileData = await trpc.downloadFile.query({ unique_url: uniqueUrl });
      if (!fileData) {
        setError('File not found or no longer available');
        return;
      }

      // Convert base64 to blob and trigger download
      const byteCharacters = atob(fileData.file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.mimetype });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileRecord.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to download file:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading file...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fileRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="text-center py-12">
            <Alert className="max-w-md mx-auto border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error || 'File not found'}
              </AlertDescription>
            </Alert>
            {onBack && (
              <Button onClick={onBack} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">📦 Earl Box</h1>
            <p className="text-gray-600">File Preview & Download</p>
          </div>
        </div>

        {/* File Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getFileIcon(fileRecord.mimetype)}
              <div>
                <div className="text-xl">{fileRecord.original_filename}</div>
                <div className="text-sm font-normal text-gray-500 flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{fileRecord.mimetype}</Badge>
                  <span>{formatFileSize(fileRecord.size)}</span>
                  <span>•</span>
                  <span>Uploaded {fileRecord.created_at.toLocaleDateString()}</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownload} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </CardContent>
        </Card>

        {/* File Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl && (
              <div className="flex justify-center">
                {fileRecord.mimetype.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={fileRecord.original_filename}
                    className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    style={{ objectFit: 'contain' }}
                  />
                ) : fileRecord.mimetype.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    style={{ objectFit: 'contain' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Preview not available for this file type</p>
                  </div>
                )}
              </div>
            )}
            
            {!previewUrl && (
              <div className="text-center py-8 text-gray-500">
                <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Loading preview...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t">
          <p className="text-gray-500 text-sm">Created by Earl Store❤️</p>
        </div>
      </div>
    </div>
  );
}
