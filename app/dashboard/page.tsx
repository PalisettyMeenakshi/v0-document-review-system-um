"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Upload, FileBarChart, Clock, ArrowRight } from "lucide-react"

interface Report {
  id: string
  fileName: string
  createdAt: string
  overallScore: number
}

interface DocumentData {
  id: string
  fileName: string
  uploadedAt: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [userName, setUserName] = useState("")

  useEffect(() => {
    // Load user info
    const userStr = localStorage.getItem("docreview_user")
    if (userStr) {
      const user = JSON.parse(userStr)
      setUserName(user.email?.split("@")[0] || "User")
    }

    // Load documents
    const docsStr = localStorage.getItem("docreview_documents")
    if (docsStr) {
      setDocuments(JSON.parse(docsStr))
    }

    // Load reports
    const reportsStr = localStorage.getItem("docreview_reports")
    if (reportsStr) {
      setReports(JSON.parse(reportsStr))
    }
  }, [])

  const latestReport = reports.length > 0 ? reports[reports.length - 1] : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and analyze your documents with AI-powered multi-agent analysis
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total Documents */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documents
            </CardTitle>
            <FileText className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{documents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Files uploaded for analysis
            </p>
          </CardContent>
        </Card>

        {/* Total Reports */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analysis Reports
            </CardTitle>
            <FileBarChart className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed document reviews
            </p>
          </CardContent>
        </Card>

        {/* Latest Score */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Score
            </CardTitle>
            <Clock className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {latestReport ? `${latestReport.overallScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestReport ? latestReport.fileName : "No reports yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Upload Document</CardTitle>
            <CardDescription>
              Upload a new document for AI-powered analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/upload">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Upload className="mr-2 h-4 w-4" />
                Upload New Document
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Latest Report Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Latest Report</CardTitle>
            <CardDescription>
              {latestReport 
                ? `View analysis for ${latestReport.fileName}` 
                : "No reports available yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reports">
              <Button 
                variant="outline" 
                className="w-full border-border text-foreground hover:bg-secondary"
              >
                View Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      {documents.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.slice(-5).reverse().map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
