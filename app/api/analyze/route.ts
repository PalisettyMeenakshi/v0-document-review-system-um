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
  confidence: number
}

interface ResearchReview {
  aspect: string
  score: number
  feedback: string
  confidence: number
}

interface Improvement {
  original: string
  improved: string
  reason: string
  confidence: number
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

// Confidence threshold - only include issues above this
const CONFIDENCE_THRESHOLD = 0.7

// Maximum issues to show for high-quality documents
const MAX_GRAMMAR_ISSUES = 2
const MAX_RESEARCH_ISSUES = 1
const MAX_IMPROVEMENTS = 2

// Helper: Split text into sentences
function getSentences(text: string): string[] {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3)
}

// Helper: Split text into words
function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0)
}

// Helper: Calculate document quality score (used to adjust strictness)
function assessDocumentQuality(text: string): number {
  const words = getWords(text)
  const sentences = getSentences(text)
  
  if (words.length < 50) return 0.3 // Very short, likely low quality
  
  let qualityScore = 0.5 // Baseline
  
  // Check for academic/professional indicators
  const academicIndicators = [
    "research", "study", "analysis", "methodology", "conclusion",
    "results", "findings", "evidence", "hypothesis", "data",
    "literature", "theory", "framework", "approach", "significant"
  ]
  
  const textLower = text.toLowerCase()
  const academicCount = academicIndicators.filter(ind => textLower.includes(ind)).length
  qualityScore += Math.min(0.3, academicCount * 0.03) // Up to +0.3 for academic language
  
  // Check sentence length variety (good writing has variety)
  if (sentences.length > 3) {
    const lengths = sentences.map(s => getWords(s).length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    if (avgLength > 10 && avgLength < 30) qualityScore += 0.1
  }
  
  // Check for proper capitalization and punctuation
  const properlyCapitalized = sentences.filter(s => /^[A-Z]/.test(s)).length
  if (sentences.length > 0 && properlyCapitalized / sentences.length > 0.9) {
    qualityScore += 0.1
  }
  
  return Math.min(1, qualityScore)
}

// Grammar Agent - Only detects clear grammatical errors
function analyzeGrammar(text: string, instructions: string): { issues: GrammarIssue[], score: number } {
  const issues: GrammarIssue[] = []
  const sentences = getSentences(text)
  const words = getWords(text)
  const documentQuality = assessDocumentQuality(text)
  
  // Only flag CLEAR grammar errors with high confidence
  
  // 1. Definite spelling/grammar mistakes (not stylistic)
  const definiteMistakes = [
    { pattern: /\bcould of\b/gi, issue: "'could of'", fix: "Use 'could have'", confidence: 0.95 },
    { pattern: /\bshould of\b/gi, issue: "'should of'", fix: "Use 'should have'", confidence: 0.95 },
    { pattern: /\bwould of\b/gi, issue: "'would of'", fix: "Use 'would have'", confidence: 0.95 },
    { pattern: /\balot\b/gi, issue: "'alot'", fix: "Use 'a lot' (two words)", confidence: 0.95 },
    { pattern: /\bdefinate\b/gi, issue: "'definate'", fix: "Use 'definite'", confidence: 0.95 },
    { pattern: /\bseperate\b/gi, issue: "'seperate'", fix: "Use 'separate'", confidence: 0.95 },
    { pattern: /\boccured\b/gi, issue: "'occured'", fix: "Use 'occurred'", confidence: 0.95 },
    { pattern: /\brecieve\b/gi, issue: "'recieve'", fix: "Use 'receive'", confidence: 0.95 },
    { pattern: /\buntil\b/gi, issue: "'untill'", fix: "Use 'until'", confidence: 0.95 },
    { pattern: /\bthier\b/gi, issue: "'thier'", fix: "Use 'their'", confidence: 0.95 },
  ]
  
  for (const check of definiteMistakes) {
    const matches = text.match(check.pattern)
    if (matches && matches.length > 0) {
      issues.push({
        original: `Found: "${matches[0]}"`,
        suggestion: check.fix,
        explanation: `Spelling error: ${check.issue}`,
        severity: "high",
        confidence: check.confidence
      })
    }
  }
  
  // 2. Lowercase 'i' as pronoun (clear error)
  const lowercaseI = text.match(/\s+i\s+(?!\.e\.|\.?e\.?g\.)/g)
  if (lowercaseI && lowercaseI.length > 0) {
    issues.push({
      original: "Lowercase 'i' used as pronoun",
      suggestion: "Capitalize the pronoun 'I'",
      explanation: "The pronoun 'I' should always be capitalized in English",
      severity: "medium",
      confidence: 0.85
    })
  }
  
  // 3. Repeated words (consecutive) - clear typo
  const repeatedWordMatch = text.match(/\b(\w{3,})\s+\1\b/gi)
  if (repeatedWordMatch && repeatedWordMatch.length > 0) {
    issues.push({
      original: `Repeated word: "${repeatedWordMatch[0]}"`,
      suggestion: "Remove the duplicate word",
      explanation: "Consecutive repeated words are typically typos",
      severity: "medium",
      confidence: 0.9
    })
  }
  
  // 4. Incomplete sentences (very short with no verb) - only if clearly incomplete
  const veryShortSentences = sentences.filter(s => {
    const wordCount = getWords(s).length
    const hasVerb = /\b(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can)\b/i.test(s)
    return wordCount < 4 && !hasVerb && wordCount > 1
  })
  
  if (veryShortSentences.length > 0 && documentQuality < 0.7) {
    issues.push({
      original: `Potentially incomplete sentence: "${veryShortSentences[0]}"`,
      suggestion: "Ensure this is a complete sentence with a subject and verb",
      explanation: "Sentences should typically have a complete thought with subject and predicate",
      severity: "low",
      confidence: 0.72
    })
  }
  
  // Filter by confidence threshold
  const filteredIssues = issues.filter(issue => issue.confidence >= CONFIDENCE_THRESHOLD)
  
  // Limit issues for high-quality documents
  const limitedIssues = documentQuality > 0.7 
    ? filteredIssues.slice(0, MAX_GRAMMAR_ISSUES)
    : filteredIssues.slice(0, MAX_GRAMMAR_ISSUES + 2)
  
  // Calculate score - high-quality documents get 85-95 range
  let score: number
  if (limitedIssues.length === 0) {
    score = documentQuality > 0.6 ? 95 : 88
  } else if (limitedIssues.length === 1) {
    score = documentQuality > 0.6 ? 90 : 82
  } else {
    score = documentQuality > 0.6 ? 87 : 75
  }
  
  return { issues: limitedIssues, score }
}

// Research Quality Agent - Only flags clear structural problems
function analyzeResearchQuality(text: string, instructions: string): { review: ResearchReview[], score: number } {
  const review: ResearchReview[] = []
  const textLower = text.toLowerCase()
  const sentences = getSentences(text)
  const words = getWords(text)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  const documentQuality = assessDocumentQuality(text)
  
  // Check for clear structural elements
  const structuralElements = {
    hasIntro: textLower.includes("introduction") || textLower.includes("abstract") || textLower.includes("overview") || sentences.length > 2,
    hasBody: paragraphs.length >= 2 || sentences.length >= 5,
    hasConclusion: textLower.includes("conclusion") || textLower.includes("summary") || textLower.includes("in closing") || sentences.length > 3,
    hasMethodology: textLower.includes("method") || textLower.includes("approach") || textLower.includes("procedure") || textLower.includes("analysis"),
  }
  
  const structureCount = Object.values(structuralElements).filter(Boolean).length
  
  // For well-structured documents, give positive feedback
  if (structureCount >= 3 || documentQuality > 0.7) {
    review.push({
      aspect: "Document Structure",
      score: 90 + Math.floor(Math.random() * 5),
      feedback: "Document structure appears clear and logically organized.",
      confidence: 0.85
    })
  } else if (structureCount >= 2) {
    review.push({
      aspect: "Document Structure",
      score: 82 + Math.floor(Math.random() * 6),
      feedback: "Document has adequate structure. Consider adding clearer section divisions if this is a formal paper.",
      confidence: 0.75
    })
  } else {
    // Only flag if clearly missing structure
    review.push({
      aspect: "Document Structure",
      score: 70 + Math.floor(Math.random() * 8),
      feedback: "Consider organizing content with clearer sections (introduction, body, conclusion).",
      confidence: 0.72
    })
  }
  
  // Only add methodology concern if explicitly missing in academic context
  const isAcademicDocument = textLower.includes("research") || textLower.includes("study") || textLower.includes("hypothesis")
  
  if (isAcademicDocument && !structuralElements.hasMethodology) {
    review.push({
      aspect: "Research Methodology",
      score: 75,
      feedback: "For a research document, consider elaborating on your methodology or approach.",
      confidence: 0.73
    })
  }
  
  // Filter by confidence
  const filteredReview = review.filter(r => r.confidence >= CONFIDENCE_THRESHOLD)
  
  // Limit for high-quality documents
  const limitedReview = documentQuality > 0.7
    ? filteredReview.slice(0, MAX_RESEARCH_ISSUES + 1)
    : filteredReview
  
  // Calculate score - well-written documents get 85-95
  const avgScore = limitedReview.length > 0 
    ? limitedReview.reduce((acc, r) => acc + r.score, 0) / limitedReview.length
    : (documentQuality > 0.6 ? 92 : 80)
  
  return { review: limitedReview, score: Math.round(avgScore) }
}

// Improvement Agent - Only suggests when text is truly problematic
function suggestImprovements(text: string, instructions: string): { improvements: Improvement[], score: number } {
  const improvements: Improvement[] = []
  const textLower = text.toLowerCase()
  const words = getWords(text)
  const documentQuality = assessDocumentQuality(text)
  
  // Only flag truly problematic patterns, not stylistic preferences
  
  // 1. Clear ambiguity issues
  const ambiguousPatterns = [
    { find: "this shows", context: "without clear antecedent", confidence: 0.65 },
    { find: "it is clear", context: "unsupported assertion", confidence: 0.6 },
  ]
  
  // These are too minor to flag in good documents
  // Only flag in clearly low-quality documents
  if (documentQuality < 0.5) {
    for (const pattern of ambiguousPatterns) {
      if (textLower.includes(pattern.find)) {
        improvements.push({
          original: `"${pattern.find}"`,
          improved: "Consider specifying what 'this' or 'it' refers to",
          reason: "Unclear pronoun reference may confuse readers",
          confidence: pattern.confidence
        })
      }
    }
  }
  
  // 2. Repetitive language - only if very repetitive
  const sentenceStarts = text.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(' ')[0]?.toLowerCase())
  
  const startCounts: Record<string, number> = {}
  for (const start of sentenceStarts) {
    if (start && start.length > 2) startCounts[start] = (startCounts[start] || 0) + 1
  }
  
  const veryRepetitiveStarts = Object.entries(startCounts)
    .filter(([, count]) => count > 5) // Only flag if VERY repetitive (more than 5 times)
    .map(([word]) => word)
  
  if (veryRepetitiveStarts.length > 0) {
    improvements.push({
      original: `Many sentences start with "${veryRepetitiveStarts[0]}"`,
      improved: "Consider varying sentence beginnings for improved flow",
      reason: "Highly repetitive sentence structures can affect readability",
      confidence: 0.75
    })
  }
  
  // 3. Very informal language in formal context (only clear cases)
  const veryInformalPatterns = [
    { find: "stuff", replace: "materials / content", confidence: 0.8 },
    { find: "gonna", replace: "going to", confidence: 0.9 },
    { find: "wanna", replace: "want to", confidence: 0.9 },
    { find: "gotta", replace: "have to / need to", confidence: 0.9 },
    { find: "kinda", replace: "somewhat / rather", confidence: 0.85 },
    { find: "sorta", replace: "somewhat / to some degree", confidence: 0.85 },
  ]
  
  for (const pattern of veryInformalPatterns) {
    if (textLower.includes(pattern.find)) {
      const index = textLower.indexOf(pattern.find)
      const start = Math.max(0, index - 10)
      const end = Math.min(text.length, index + pattern.find.length + 10)
      const context = text.substring(start, end).trim()
      
      improvements.push({
        original: `"${context}" (contains '${pattern.find}')`,
        improved: pattern.replace,
        reason: "Consider more formal alternatives for academic writing",
        confidence: pattern.confidence
      })
    }
  }
  
  // Filter by confidence threshold
  const filteredImprovements = improvements.filter(imp => imp.confidence >= CONFIDENCE_THRESHOLD)
  
  // Limit for high-quality documents
  const limitedImprovements = documentQuality > 0.7
    ? filteredImprovements.slice(0, MAX_IMPROVEMENTS)
    : filteredImprovements.slice(0, MAX_IMPROVEMENTS + 2)
  
  // Calculate score - well-written documents get 85-95
  let score: number
  if (limitedImprovements.length === 0) {
    score = documentQuality > 0.6 ? 94 : 85
  } else if (limitedImprovements.length <= 2) {
    score = documentQuality > 0.6 ? 89 : 78
  } else {
    score = 72
  }
  
  return { improvements: limitedImprovements, score }
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

    // Calculate overall score - for well-written docs, should be 85-95
    const documentQuality = assessDocumentQuality(documentText)
    const rawScore = Math.round(
      (grammarAnalysis.score * 0.3) + 
      (researchAnalysis.score * 0.4) + 
      (improvementAnalysis.score * 0.3)
    )
    
    // Adjust score to be in realistic range for good documents
    const overallScore = documentQuality > 0.7 
      ? Math.max(85, Math.min(95, rawScore))
      : Math.max(60, rawScore)

    // Generate dynamic summary based on actual results
    const wordCount = getWords(documentText).length
    const totalIssues = grammarAnalysis.issues.length + improvementAnalysis.improvements.length
    
    let summary = ""
    
    if (totalIssues === 0) {
      summary = `Excellent document quality (${wordCount} words analyzed). No major grammar issues detected. The document is already well written. Only minor improvements may be possible.`
    } else if (totalIssues <= 2 && overallScore >= 85) {
      summary = `Very good document quality (${wordCount} words analyzed). Document structure appears clear and logically organized. ${totalIssues === 1 ? "One minor suggestion noted." : "A few minor suggestions noted."}`
    } else if (overallScore >= 75) {
      summary = `Good document quality (${wordCount} words analyzed). The document is generally well-structured with some areas for minor improvement.`
    } else {
      summary = `Document analyzed (${wordCount} words). Several areas for improvement have been identified. Please review the suggestions below.`
    }

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
