"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Save, 
  CheckCircle2, 
  Lightbulb,
  Sparkles
} from "lucide-react"

const EXAMPLE_INSTRUCTIONS = [
  "Check grammar and punctuation thoroughly",
  "Evaluate research methodology clarity",
  "Assess logical flow and structure",
  "Suggest improvements for academic tone",
  "Check citation format consistency",
  "Evaluate argument strength and evidence",
]

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedInstructions = localStorage.getItem("docreview_mentor_instructions")
    if (savedInstructions) {
      setInstructions(savedInstructions)
    }
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 500))
    localStorage.setItem("docreview_mentor_instructions", instructions)
    setIsSaved(true)
    setIsLoading(false)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const addExample = (example: string) => {
    setInstructions(prev => {
      if (prev.trim()) {
        return `${prev}\n${example}`
      }
      return example
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Mentor Instructions
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize how the AI agents analyze your documents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Instructions Input */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <BookOpen className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-card-foreground">Evaluation Guidelines</CardTitle>
                  <CardDescription>
                    Provide specific instructions for the AI analysis
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your evaluation instructions here...&#10;&#10;Example:&#10;- Focus on grammar and punctuation&#10;- Check research methodology&#10;- Suggest academic improvements"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[300px] bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {instructions.length} characters
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : isSaved ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Instructions
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Examples Sidebar */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-card-foreground text-base">Quick Add</CardTitle>
                  <CardDescription>
                    Click to add example instructions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_INSTRUCTIONS.map((example) => (
                  <Badge
                    key={example}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors py-1.5 px-3"
                    onClick={() => addExample(example)}
                  >
                    + {example}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-card-foreground text-base">AI Agents</CardTitle>
                  <CardDescription>
                    Your instructions guide these agents
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium text-foreground">Grammar Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Detects and corrects grammatical errors
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium text-foreground">Research Quality Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Evaluates structure, logic, and clarity
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium text-foreground">Improvement Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suggests rewrites and tone enhancements
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
