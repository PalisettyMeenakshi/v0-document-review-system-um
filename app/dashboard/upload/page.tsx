"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Upload, 
  FileText, 
  FileImage, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

const SUPPORTED_TYPES = {
  "application/pdf": { ext: "PDF", icon: FileText },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "DOCX", icon: FileText },
  "text/plain": { ext: "TXT", icon: FileText },
  "image/png": { ext: "PNG", icon: FileImage },
  "image/jpeg": { ext: "JPG", icon: FileImage },
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface UploadedFile {
  file: File
  id: string
  status: "uploading" | "processing" | "complete" | "error"
  progress: number
  error?: string
  extractedText?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const router = useRouter()

  const validateFile = (file: File): string | null => {
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return `Unsupported file type. Please upload PDF, DOCX, TXT, PNG, or JPG files.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB.`
    }
    return null
  }

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text files, read directly
    if (file.type === "text/plain") {
      return await file.text()
    }
    
    // For DOCX files, extract text from the XML content
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // DOCX is a zip file, try to find text content patterns
        const textDecoder = new TextDecoder('utf-8', { fatal: false })
        const rawText = textDecoder.decode(uint8Array)
        
        // Extract text between XML tags (simplified extraction)
        const textMatches = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
        if (textMatches && textMatches.length > 0) {
          const extractedText = textMatches
            .map(match => match.replace(/<[^>]+>/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (extractedText.length > 50) {
            return `[Document: ${file.name}]\n\n${extractedText}`
          }
        }
        
        // Fallback: extract any readable text from the binary
        const readableText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        if (readableText.length > 100) {
          return `[Document: ${file.name}]\n\n${readableText.substring(0, 5000)}`
        }
      } catch (e) {
        console.error("Error extracting DOCX text:", e)
      }
    }
    
    // For PDF files, extract readable text
    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const textDecoder = new TextDecoder('utf-8', { fatal: false })
        const rawContent = textDecoder.decode(uint8Array)
        
        // Extract text between parentheses (PDF text streams) and BT/ET blocks
        const textParts: string[] = []
        
        // Method 1: Extract text from text objects (Tj and TJ operators)
        const tjMatches = rawContent.match(/\(([^)]+)\)\s*Tj/g)
        if (tjMatches) {
          tjMatches.forEach(match => {
            const text = match.replace(/\(|\)\s*Tj/g, '')
            if (text.length > 2) textParts.push(text)
          })
        }
        
        // Method 2: Extract readable strings
        const readableMatches = rawContent.match(/[A-Za-z][A-Za-z0-9\s.,;:!?'-]{10,}/g)
        if (readableMatches) {
          textParts.push(...readableMatches)
        }
        
        if (textParts.length > 0) {
          const uniqueText = [...new Set(textParts)].join(' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (uniqueText.length > 50) {
            return `[PDF Document: ${file.name}]\n\n${uniqueText.substring(0, 5000)}`
          }
        }
        
        // Fallback for PDFs
        return `[PDF Document: ${file.name}]\n\nPDF content detected but text extraction limited. File size: ${file.size} bytes. The document appears to contain ${Math.ceil(file.size / 1000)} KB of data. Please ensure the PDF contains selectable text rather than scanned images for better analysis results.`
      } catch (e) {
        console.error("Error extracting PDF text:", e)
      }
    }
    
    // For images, create a description based on file metadata
    if (file.type.startsWith("image/")) {
      const imageInfo = `[Image: ${file.name}]\n\nImage file detected (${file.type}). File size: ${(file.size / 1024).toFixed(2)} KB.\n\nNote: For text analysis, please upload text documents (PDF, DOCX, TXT). Image-based documents would require OCR processing which is not currently supported in this version.\n\nFile metadata:\n- Name: ${file.name}\n- Type: ${file.type}\n- Size: ${file.size} bytes\n- Last modified: ${new Date(file.lastModified).toISOString()}`
      
      return imageInfo
    }
    
    // Generic fallback - read as much text as possible
    try {
      const text = await file.text()
      if (text && text.length > 0) {
        return `[Document: ${file.name}]\n\n${text.substring(0, 5000)}`
      }
    } catch {
      // File can't be read as text
    }
    
    return `[Document: ${file.name}]\n\nUnable to extract text content from this file type (${file.type}). File size: ${file.size} bytes.`
  }

  const processFile = async (uploadedFile: UploadedFile) => {
    const updateFile = (updates: Partial<UploadedFile>) => {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, ...updates } : f
      ))
    }

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 100))
        updateFile({ progress: i, status: "uploading" })
      }

      // Extract text
      updateFile({ status: "processing", progress: 100 })
      const extractedText = await extractTextFromFile(uploadedFile.file)
      
      await new Promise(r => setTimeout(r, 500))
      
      // Save document to localStorage
      const docs = JSON.parse(localStorage.getItem("docreview_documents") || "[]")
      const newDoc = {
        id: uploadedFile.id,
        fileName: uploadedFile.file.name,
        fileType: uploadedFile.file.type,
        fileSize: uploadedFile.file.size,
        extractedText,
        uploadedAt: new Date().toISOString(),
      }
      docs.push(newDoc)
      localStorage.setItem("docreview_documents", JSON.stringify(docs))

      updateFile({ status: "complete", extractedText })
    } catch {
      updateFile({ status: "error", error: "Failed to process file" })
    }
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []

    Array.from(fileList).forEach(file => {
      const error = validateFile(file)
      const uploadedFile: UploadedFile = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: error ? "error" : "uploading",
        progress: 0,
        error: error || undefined,
      }
      newFiles.push(uploadedFile)
    })

    setFiles(prev => [...prev, ...newFiles])

    // Process valid files
    newFiles.forEach(f => {
      if (!f.error) {
        processFile(f)
      }
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const analyzeDocument = (fileId: string) => {
    router.push(`/dashboard/reports?analyze=${fileId}`)
  }

  const completedFiles = files.filter(f => f.status === "complete")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Upload Document</h1>
        <p className="text-muted-foreground mt-1">
          Upload your documents for AI-powered multi-agent analysis
        </p>
      </div>

      {/* Upload Zone */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Drop your files here</CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, TXT, PNG, JPG (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-all",
              isDragOver 
                ? "border-accent bg-accent/10" 
                : "border-border hover:border-accent/50 hover:bg-secondary/30"
            )}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                "p-4 rounded-full transition-colors",
                isDragOver ? "bg-accent" : "bg-secondary"
              )}>
                <Upload className={cn(
                  "h-8 w-8",
                  isDragOver ? "text-accent-foreground" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isDragOver ? "Drop files here" : "Drag and drop files"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse your computer
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Uploaded Files</CardTitle>
            <CardDescription>
              {completedFiles.length} of {files.length} files ready for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((f) => {
                const TypeInfo = SUPPORTED_TYPES[f.file.type as keyof typeof SUPPORTED_TYPES]
                const Icon = TypeInfo?.icon || FileText

                return (
                  <div 
                    key={f.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="p-2 rounded-lg bg-accent/20">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {f.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {f.status === "uploading" && (
                          <>
                            <Progress value={f.progress} className="h-1.5 flex-1 max-w-32" />
                            <span className="text-xs text-muted-foreground">
                              {f.progress}%
                            </span>
                          </>
                        )}
                        {f.status === "processing" && (
                          <span className="text-xs text-accent flex items-center gap-1">
                            <span className="h-3 w-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                            Processing...
                          </span>
                        )}
                        {f.status === "complete" && (
                          <span className="text-xs text-accent flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready for analysis
                          </span>
                        )}
                        {f.status === "error" && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {f.error}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.status === "complete" && (
                        <Button
                          size="sm"
                          onClick={() => analyzeDocument(f.id)}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Analyze
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(f.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
