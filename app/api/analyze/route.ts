import { NextRequest, NextResponse } from "next/server"

interface AnalysisRequest {
  documentText: string
  mentorInstructions?: string
}

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

// Simulated Grammar Agent
function analyzeGrammar(text: string, instructions: string): { issues: GrammarIssue[], score: number } {
  const issues: GrammarIssue[] = []
  
  // Check for common grammar patterns
  if (text.toLowerCase().includes("their") || text.toLowerCase().includes("there")) {
    issues.push({
      original: "their/there usage",
      suggestion: "Verify correct usage of 'their' (possessive) vs 'there' (location)",
      explanation: "Ensure proper homophone usage throughout the document",
      severity: "medium"
    })
  }

  if (text.includes("  ")) {
    issues.push({
      original: "Double spaces detected",
      suggestion: "Use single spaces between words",
      explanation: "Multiple spaces affect document formatting",
      severity: "low"
    })
  }

  if (!text.endsWith(".") && !text.endsWith("?") && !text.endsWith("!")) {
    issues.push({
      original: "Missing ending punctuation",
      suggestion: "Add appropriate punctuation at the end of sentences",
      explanation: "Proper punctuation improves readability",
      severity: "medium"
    })
  }

  // Add instruction-based analysis
  if (instructions.toLowerCase().includes("punctuation")) {
    issues.push({
      original: "Punctuation review requested",
      suggestion: "Document punctuation has been thoroughly reviewed",
      explanation: "Based on mentor instructions for punctuation focus",
      severity: "low"
    })
  }

  // Simulate finding some issues based on text length
  if (text.length > 200) {
    issues.push({
      original: "Sentence structure variation",
      suggestion: "Consider varying sentence lengths for better flow",
      explanation: "A mix of short and long sentences improves readability",
      severity: "low"
    })
  }

  if (text.toLowerCase().includes("however") || text.toLowerCase().includes("therefore")) {
    issues.push({
      original: "Transitional words usage",
      suggestion: "Ensure transitional words are properly punctuated",
      explanation: "Words like 'however' and 'therefore' often require commas",
      severity: "medium"
    })
  }

  const score = Math.max(60, 100 - (issues.filter(i => i.severity === "high").length * 15) - 
    (issues.filter(i => i.severity === "medium").length * 8) - 
    (issues.filter(i => i.severity === "low").length * 3))

  return { issues, score }
}

// Simulated Research Quality Agent
function analyzeResearchQuality(text: string, instructions: string): { review: ResearchReview[], score: number } {
  const review: ResearchReview[] = []
  const textLower = text.toLowerCase()

  // Structure analysis
  const hasIntro = textLower.includes("introduction") || textLower.includes("abstract") || text.length > 100
  const hasConclusion = textLower.includes("conclusion") || textLower.includes("summary") || textLower.includes("findings")
  const hasMethodology = textLower.includes("method") || textLower.includes("approach") || textLower.includes("analysis")

  review.push({
    aspect: "Document Structure",
    score: hasIntro && hasConclusion ? 85 : hasIntro || hasConclusion ? 70 : 55,
    feedback: hasIntro && hasConclusion 
      ? "Document has clear introduction and conclusion sections"
      : "Consider adding clearer structural elements (introduction, body, conclusion)"
  })

  review.push({
    aspect: "Research Methodology",
    score: hasMethodology ? 80 : 60,
    feedback: hasMethodology 
      ? "Research methodology is present and explained"
      : "Consider elaborating on the research methodology used"
  })

  // Clarity analysis
  const avgSentenceLength = text.split(/[.!?]/).filter(s => s.trim()).reduce((acc, s) => acc + s.split(" ").length, 0) / 
    Math.max(1, text.split(/[.!?]/).filter(s => s.trim()).length)
  
  review.push({
    aspect: "Clarity of Expression",
    score: avgSentenceLength > 30 ? 65 : avgSentenceLength > 20 ? 75 : 85,
    feedback: avgSentenceLength > 25 
      ? "Some sentences are quite long. Consider breaking them up for clarity"
      : "Good sentence length variation for readability"
  })

  // Evidence analysis
  const hasEvidence = textLower.includes("evidence") || textLower.includes("data") || 
    textLower.includes("results") || textLower.includes("findings")
  
  review.push({
    aspect: "Evidence & Support",
    score: hasEvidence ? 82 : 65,
    feedback: hasEvidence 
      ? "Document includes supporting evidence and data"
      : "Consider adding more concrete evidence to support claims"
  })

  // Instruction-based analysis
  if (instructions.toLowerCase().includes("methodology")) {
    review.push({
      aspect: "Methodology Focus (Per Instructions)",
      score: hasMethodology ? 85 : 70,
      feedback: "Methodology section reviewed as per mentor instructions"
    })
  }

  const avgScore = review.reduce((acc, r) => acc + r.score, 0) / review.length

  return { review, score: Math.round(avgScore) }
}

// Simulated Improvement Agent
function suggestImprovements(text: string, instructions: string): { improvements: Improvement[], score: number } {
  const improvements: Improvement[] = []

  // Academic tone improvements
  if (text.includes("a lot") || text.includes("lots of")) {
    improvements.push({
      original: "a lot / lots of",
      improved: "numerous / significant / substantial",
      reason: "Use more formal vocabulary for academic writing"
    })
  }

  if (text.includes("really") || text.includes("very")) {
    improvements.push({
      original: "really / very",
      improved: "significantly / considerably / notably",
      reason: "Replace informal intensifiers with academic alternatives"
    })
  }

  if (text.includes("thing") || text.includes("things")) {
    improvements.push({
      original: "thing(s)",
      improved: "aspect(s) / element(s) / factor(s)",
      reason: "Use specific, descriptive nouns instead of vague terms"
    })
  }

  // Sentence improvements
  if (text.includes("In conclusion") || text.includes("To sum up")) {
    improvements.push({
      original: "In conclusion / To sum up",
      improved: "This analysis demonstrates / The findings indicate",
      reason: "Use more engaging conclusion starters"
    })
  }

  // Passive voice suggestions
  if (text.toLowerCase().includes("was done") || text.toLowerCase().includes("were made")) {
    improvements.push({
      original: "Passive constructions (was done, were made)",
      improved: "Active voice alternatives",
      reason: "Consider using active voice for clearer, more direct writing"
    })
  }

  // Add general improvement
  improvements.push({
    original: "Overall document flow",
    improved: "Consider adding transitional phrases between paragraphs",
    reason: "Smooth transitions improve document cohesion and readability"
  })

  // Instruction-based improvements
  if (instructions.toLowerCase().includes("academic")) {
    improvements.push({
      original: "Academic tone adjustment",
      improved: "Ensure formal language throughout, avoid contractions",
      reason: "Per mentor instructions for academic tone focus"
    })
  }

  const score = Math.max(70, 95 - (improvements.length * 4))

  return { improvements, score }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json()
    const { documentText, mentorInstructions = "" } = body

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: "Document text is required" },
        { status: 400 }
      )
    }

    // Simulate processing delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Run all three agents
    const grammarAnalysis = analyzeGrammar(documentText, mentorInstructions)
    const researchAnalysis = analyzeResearchQuality(documentText, mentorInstructions)
    const improvementAnalysis = suggestImprovements(documentText, mentorInstructions)

    // Calculate overall score
    const overallScore = Math.round(
      (grammarAnalysis.score * 0.3) + 
      (researchAnalysis.score * 0.4) + 
      (improvementAnalysis.score * 0.3)
    )

    // Generate summary
    const summary = overallScore >= 85 
      ? "Excellent document quality. Minor refinements suggested for optimization."
      : overallScore >= 70 
        ? "Good document quality with room for improvement. Review suggested changes."
        : "Document requires attention. Focus on the highlighted areas for improvement."

    const result: AnalysisResult = {
      grammarIssues: grammarAnalysis.issues,
      grammarScore: grammarAnalysis.score,
      researchReview: researchAnalysis.review,
      researchScore: researchAnalysis.score,
      improvements: improvementAnalysis.improvements,
      improvementScore: improvementAnalysis.score,
      overallScore,
      summary
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    )
  }
}
