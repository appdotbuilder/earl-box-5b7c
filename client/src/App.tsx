
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Eye, Copy, Check, FileImage, Video, Share2 } from 'lucide-react';
// Use type-only imports to avoid conflicts with browser File type
import type { File as FileRecord, FileStats } from '../../server/src/schema';

function App() {
  const [stats, setStats] = useState<FileStats>({ total_files: 0, total_size: 0 });
  const [uploadedFiles, setUploadedFiles] = useState<FileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const result = await trpc.getFileStats.query();
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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

  const isImageOrVideo = (mimetype: string): boolean => {
    return mimetype.startsWith('image/') || mimetype.startsWith('video/');
  };

  const generateShareUrl = (uniqueUrl: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${uniqueUrl}`;
  };

  const copyToClipboard = async (url: string, uniqueUrl: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(uniqueUrl);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (browserFile: File) => {
    if (!isImageOrVideo(browserFile.type)) {
      setError('Please upload only image or video files');
      return;
    }

    if (browserFile.size > 200 * 1024 * 1024) { // 200MB limit
      setError('File size must be less than 200MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const base64Data = await convertFileToBase64(browserFile);
      
      const uploadedFile = await trpc.uploadFile.mutate({
        filename: browserFile.name,
        original_filename: browserFile.name,
        mimetype: browserFile.type,
        size: browserFile.size,
        file_data: base64Data
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadedFiles((prev: FileRecord[]) => [uploadedFile, ...prev]);
      await loadStats(); // Refresh stats

      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to upload file:', error);
      setError('Failed to upload file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      await uploadFile(files[0]);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await uploadFile(files[0]);
    }
  };

  const handleDownload = async (uniqueUrl: string, originalFilename: string) => {
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
      link.download = originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to download file:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📦 Earl Box</h1>
          <p className="text-gray-600">Share images and videos instantly with unique links</p>
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_files}</div>
                <div className="text-sm text-gray-500">Files Shared</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatFileSize(stats.total_size)}</div>
                <div className="text-sm text-gray-500">Total Storage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Drag and drop or click to select images and videos (up to 200MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="space-y-2">
                  <div className="text-blue-600">Uploading... {uploadProgress}%</div>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <div className="text-gray-600">Drop files here or click to browse</div>
                  <div className="text-sm text-gray-400 mt-1">Images and videos only</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Recently Uploaded Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadedFiles.map((fileRecord: FileRecord) => {
                  const shareUrl = generateShareUrl(fileRecord.unique_url);
                  const isCopied = copiedUrl === fileRecord.unique_url;
                  
                  return (
                    <div
                      key={fileRecord.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(fileRecord.mimetype)}
                        <div>
                          <div className="font-medium text-gray-900">{fileRecord.original_filename}</div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(fileRecord.size)} • {fileRecord.created_at.toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary">{fileRecord.mimetype.split('/')[0]}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(shareUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(fileRecord.unique_url, fileRecord.original_filename)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(shareUrl, fileRecord.unique_url)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t">
          <p className="text-gray-500 text-sm">Created by Earl Store❤️</p>
        </div>
      </div>
    </div>
  );
}

export default App;
