"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileBarChart, 
  FileText, 
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ChevronRight,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GrammarIssue {
  original: string
  suggestion: string
  explanation: string
  severity: "low" | "medium" | "high"
}

interface ResearchReview {
  aspect: string
  score: number
  feedback: string
}

interface Improvement {
  original: string
  improved: string
  reason: string
}

interface AnalysisResult {
  grammarIssues: GrammarIssue[]
  grammarScore: number
  researchReview: ResearchReview[]
  researchScore: number
  improvements: Improvement[]
  improvementScore: number
  overallScore: number
  summary: string
}

interface Document {
  id: string
  fileName: string
  fileType: string
  extractedText: string
  uploadedAt: string
}

interface Report {
  id: string
  documentId: string
  fileName: string
  createdAt: string
  analysis: AnalysisResult
  overallScore: number
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const analyzeId = searchParams.get("analyze")
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)

  useEffect(() => {
    const docsStr = localStorage.getItem("docreview_documents")
    if (docsStr) {
      setDocuments(JSON.parse(docsStr))
    }

    const reportsStr = localStorage.getItem("docreview_reports")
    if (reportsStr) {
      setReports(JSON.parse(reportsStr))
    }
  }, [])

  useEffect(() => {
    if (analyzeId && documents.length > 0) {
      const doc = documents.find(d => d.id === analyzeId)
      if (doc) {
        analyzeDocument(doc)
      }
    }
  }, [analyzeId, documents])

  const analyzeDocument = async (doc: Document) => {
    setIsAnalyzing(true)
    setAnalyzeProgress(0)

    const mentorInstructions = localStorage.getItem("docreview_mentor_instructions") || ""

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalyzeProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: doc.extractedText,
          mentorInstructions
        })
      })

      if (!response.ok) throw new Error("Analysis failed")

      const analysis: AnalysisResult = await response.json()

      clearInterval(progressInterval)
      setAnalyzeProgress(100)

      const newReport: Report = {
        id: `report-${Date.now()}`,
        documentId: doc.id,
        fileName: doc.fileName,
        createdAt: new Date().toISOString(),
        analysis,
        overallScore: analysis.overallScore
      }

      const updatedReports = [...reports, newReport]
      setReports(updatedReports)
      localStorage.setItem("docreview_reports", JSON.stringify(updatedReports))
      setSelectedReport(newReport)

      await new Promise(r => setTimeout(r, 500))
    } catch (error) {
      console.error("Analysis error:", error)
    } finally {
      clearInterval(progressInterval)
      setIsAnalyzing(false)
    }
  }

  const downloadReport = (report: Report) => {
    const reportText = `
DOCUMENT ANALYSIS REPORT
========================
File: ${report.fileName}
Date: ${new Date(report.createdAt).toLocaleString()}
Overall Score: ${report.analysis.overallScore}%

SUMMARY
-------
${report.analysis.summary}

GRAMMAR ISSUES (Score: ${report.analysis.grammarScore}%)
---------------------------------------------------------
${report.analysis.grammarIssues.map(g => 
  `- ${g.original}\n  Suggestion: ${g.suggestion}\n  ${g.explanation}`
).join("\n\n")}

RESEARCH QUALITY (Score: ${report.analysis.researchScore}%)
-----------------------------------------------------------
${report.analysis.researchReview.map(r => 
  `- ${r.aspect}: ${r.score}%\n  ${r.feedback}`
).join("\n\n")}

SUGGESTED IMPROVEMENTS (Score: ${report.analysis.improvementScore}%)
--------------------------------------------------------------------
${report.analysis.improvements.map(i => 
  `- Original: ${i.original}\n  Improved: ${i.improved}\n  Reason: ${i.reason}`
).join("\n\n")}
    `.trim()

    const blob = new Blob([reportText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-${report.fileName}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-accent"
    if (score >= 70) return "text-yellow-500"
    return "text-destructive"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-destructive/20 text-destructive"
      case "medium": return "bg-yellow-500/20 text-yellow-500"
      default: return "bg-accent/20 text-accent"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Analysis Reports</h1>
        <p className="text-muted-foreground mt-1">
          View detailed multi-agent analysis results for your documents
        </p>
      </div>

      {/* Analysis in Progress */}
      {isAnalyzing && (
        <Card className="bg-card border-border">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-accent/20 rounded-full animate-pulse">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  Analyzing Document
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Multi-agent analysis in progress...
                </p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={analyzeProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {analyzeProgress}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-accent" />
                All Reports
              </CardTitle>
              <CardDescription>
                {reports.length} analysis report{reports.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No reports yet. Upload and analyze a document to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                        selectedReport?.id === report.id
                          ? "bg-accent/20"
                          : "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {report.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={cn("font-mono", getScoreColor(report.overallScore))}
                        >
                          {report.overallScore}%
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents to Analyze */}
          {documents.length > 0 && (
            <Card className="bg-card border-border mt-6">
              <CardHeader>
                <CardTitle className="text-card-foreground text-base">
                  Documents Ready
                </CardTitle>
                <CardDescription>
                  Click to analyze a document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.slice(-5).reverse().map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => analyzeDocument(doc)}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-50"
                    >
                      <span className="text-sm text-foreground truncate">
                        {doc.fileName}
                      </span>
                      <Sparkles className="h-4 w-4 text-accent" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Detail */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="space-y-6">
              {/* Report Header */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-card-foreground flex items-center gap-2">
                        {selectedReport.fileName}
                      </CardTitle>
                      <CardDescription>
                        Analyzed on {new Date(selectedReport.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(selectedReport)}
                        className="border-border"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReport(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={cn("text-4xl font-bold", getScoreColor(selectedReport.analysis.overallScore))}>
                        {selectedReport.analysis.overallScore}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                    </div>
                    <div className="flex-1 p-4 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-foreground">{selectedReport.analysis.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Grammar</span>
                      <span className={cn("font-mono font-bold", getScoreColor(selectedReport.analysis.grammarScore))}>
                        {selectedReport.analysis.grammarScore}%
                      </span>
                    </div>
                    <Progress value={selectedReport.analysis.grammarScore} className="h-2" />
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Research</span>
                      <span className={cn("font-mono font-bold", getScoreColor(selectedReport.analysis.researchScore))}>
                        {selectedReport.analysis.researchScore}%
                      </span>
                    </div>
                    <Progress value={selectedReport.analysis.researchScore} className="h-2" />
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Improvements</span>
                      <span className={cn("font-mono font-bold", getScoreColor(selectedReport.analysis.improvementScore))}>
                        {selectedReport.analysis.improvementScore}%
                      </span>
                    </div>
                    <Progress value={selectedReport.analysis.improvementScore} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Grammar Issues */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent" />
                    Grammar Issues
                  </CardTitle>
                  <CardDescription>
                    {selectedReport.analysis.grammarIssues.length} issue{selectedReport.analysis.grammarIssues.length !== 1 ? "s" : ""} detected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedReport.analysis.grammarIssues.map((issue, idx) => (
                      <div key={idx} className="p-4 bg-secondary/50 rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{issue.original}</p>
                            <p className="text-sm text-accent mt-1">{issue.suggestion}</p>
                            <p className="text-xs text-muted-foreground mt-2">{issue.explanation}</p>
                          </div>
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Research Quality */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-accent" />
                    Research Quality Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.analysis.researchReview.map((review, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground">{review.aspect}</p>
                            <span className={cn("font-mono text-sm", getScoreColor(review.score))}>
                              {review.score}%
                            </span>
                          </div>
                          <Progress value={review.score} className="h-1.5 mb-2" />
                          <p className="text-xs text-muted-foreground">{review.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Improvements */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    Suggested Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.analysis.improvements.map((imp, idx) => (
                      <div key={idx} className="p-4 bg-secondary/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              <span className="line-through">{imp.original}</span>
                            </p>
                            <p className="text-sm font-medium text-accent mt-1">
                              {imp.improved}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {imp.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border-border h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center">
                <FileBarChart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Select a Report</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a report from the list to view detailed analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  )
}
