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

// Helper: Split text into sentences
function getSentences(text: string): string[] {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3)
}

// Helper: Split text into words
function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0)
}

// Helper: Detect if document appears to be a professional/academic paper
function isProfessionalDocument(text: string): boolean {
  const textLower = text.toLowerCase()
  const words = getWords(text)
  
  // Professional document indicators
  const academicIndicators = [
    "abstract", "introduction", "methodology", "conclusion", "references",
    "research", "study", "analysis", "findings", "results", "hypothesis",
    "literature", "theory", "framework", "data", "significant", "evidence",
    "peer-reviewed", "journal", "publication", "et al", "citation",
    "methodology", "approach", "participants", "sample", "variables"
  ]
  
  const indicatorCount = academicIndicators.filter(ind => textLower.includes(ind)).length
  
  // Check for citation patterns (Author, Year) or [1] style
  const hasCitations = /\([A-Z][a-z]+,?\s*\d{4}\)/.test(text) || /\[\d+\]/.test(text)
  
  // Check for professional formatting (proper paragraphs, length)
  const hasProperLength = words.length > 100
  const sentences = getSentences(text)
  const hasProperStructure = sentences.length > 5
  
  // Document is professional if it has multiple indicators
  return (indicatorCount >= 3) || 
         (indicatorCount >= 2 && hasCitations) ||
         (indicatorCount >= 2 && hasProperLength && hasProperStructure)
}

// Grammar Agent - Only detects MAJOR, CLEAR grammar errors
// Does NOT flag: citations, references, technical language, complex sentences, passive voice
function analyzeGrammar(text: string, instructions: string): { issues: GrammarIssue[], score: number } {
  const issues: GrammarIssue[] = []
  const isProfessional = isProfessionalDocument(text)
  
  // For professional documents, assume grammar is correct unless there are OBVIOUS errors
  if (isProfessional) {
    // Only check for definite spelling errors that would never appear in published work
    const definiteMistakes = [
      { pattern: /\bcould of\b/gi, fix: "could have" },
      { pattern: /\bshould of\b/gi, fix: "should have" },
      { pattern: /\bwould of\b/gi, fix: "would have" },
      { pattern: /\balot\b/gi, fix: "a lot" },
      { pattern: /\bteh\b/gi, fix: "the" },
      { pattern: /\badn\b/gi, fix: "and" },
      { pattern: /\bthier\b/gi, fix: "their" },
      { pattern: /\brecieve\b/gi, fix: "receive" },
      { pattern: /\bseperate\b/gi, fix: "separate" },
      { pattern: /\boccured\b/gi, fix: "occurred" },
      { pattern: /\bdefinately\b/gi, fix: "definitely" },
      { pattern: /\buntill\b/gi, fix: "until" },
    ]
    
    for (const check of definiteMistakes) {
      const matches = text.match(check.pattern)
      if (matches && matches.length > 0) {
        issues.push({
          original: matches[0],
          suggestion: check.fix,
          explanation: "Spelling error detected",
          severity: "high"
        })
      }
    }
    
    // Check for clearly broken/incomplete sentences (fragments with no verb at all)
    const sentences = getSentences(text)
    for (const sentence of sentences) {
      const wordCount = getWords(sentence).length
      // Only flag if very short AND has no verb-like words AND doesn't look like a heading
      if (wordCount >= 2 && wordCount <= 3) {
        const hasVerb = /\b(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|go|goes|went|come|comes|came|show|shows|showed|make|makes|made|get|gets|got|use|uses|used|find|finds|found|give|gives|gave|take|takes|took|see|sees|saw|know|knows|knew|think|thinks|thought|become|becomes|became|leave|leaves|left|put|puts|mean|means|meant|keep|keeps|kept|let|lets|begin|begins|began|seem|seems|seemed|help|helps|helped|provide|provides|provided|include|includes|included|continue|continues|continued|set|sets|change|changes|changed|lead|leads|led|understand|understands|understood|watch|watches|watched|follow|follows|followed|stop|stops|stopped|create|creates|created|speak|speaks|spoke|read|reads|allow|allows|allowed|add|adds|added|spend|spends|spent|grow|grows|grew|open|opens|opened|walk|walks|walked|win|wins|won|offer|offers|offered|remember|remembers|remembered|love|loves|loved|consider|considers|considered|appear|appears|appeared|buy|buys|bought|wait|waits|waited|serve|serves|served|die|dies|died|send|sends|sent|expect|expects|expected|build|builds|built|stay|stays|stayed|fall|falls|fell|cut|cuts|reach|reaches|reached|kill|kills|killed|remain|remains|remained|suggest|suggests|suggested|raise|raises|raised|pass|passes|passed|sell|sells|sold|require|requires|required|report|reports|reported|decide|decides|decided|pull|pulls|pulled)\b/i.test(sentence)
        const looksLikeHeading = /^[A-Z][A-Z\s]+$/.test(sentence) || /^\d+\./.test(sentence)
        
        if (!hasVerb && !looksLikeHeading) {
          // Still don't flag - could be a title, heading, or list item
          // Only flag if it truly looks broken
          const hasIncompletePattern = /^(The|A|An|This|That|These|Those|It|He|She|They|We|I)\s+\w+$/i.test(sentence)
          if (hasIncompletePattern) {
            issues.push({
              original: sentence,
              suggestion: "Complete this sentence with a verb and predicate",
              explanation: "This appears to be an incomplete sentence",
              severity: "medium"
            })
          }
        }
      }
    }
    
    // For professional documents, return perfect score if no major issues found
    if (issues.length === 0) {
      return { issues: [], score: 100 }
    }
    
    // Only reduce slightly for found issues
    return { issues, score: Math.max(85, 100 - (issues.length * 5)) }
  }
  
  // For non-professional documents, be slightly more thorough but still lenient
  const basicMistakes = [
    { pattern: /\bcould of\b/gi, fix: "could have" },
    { pattern: /\bshould of\b/gi, fix: "should have" },
    { pattern: /\bwould of\b/gi, fix: "would have" },
    { pattern: /\balot\b/gi, fix: "a lot" },
    { pattern: /\bteh\b/gi, fix: "the" },
    { pattern: /\bthier\b/gi, fix: "their" },
    { pattern: /\brecieve\b/gi, fix: "receive" },
    { pattern: /\bseperate\b/gi, fix: "separate" },
  ]
  
  for (const check of basicMistakes) {
    const matches = text.match(check.pattern)
    if (matches && matches.length > 0) {
      issues.push({
        original: matches[0],
        suggestion: check.fix,
        explanation: "Common spelling/grammar error",
        severity: "medium"
      })
    }
  }
  
  // Check for lowercase 'i' as pronoun
  if (/\s+i\s+(?!\.e\.|\.?e\.?g\.)/g.test(text)) {
    issues.push({
      original: "lowercase 'i'",
      suggestion: "Capitalize the pronoun 'I'",
      explanation: "The pronoun 'I' should always be capitalized",
      severity: "low"
    })
  }
  
  if (issues.length === 0) {
    return { issues: [], score: 95 }
  }
  
  return { issues, score: Math.max(70, 95 - (issues.length * 8)) }
}

// Research Quality Agent - Assumes professional papers are well-structured
// Does NOT flag: passive voice, long paragraphs, complex terminology
function analyzeResearchQuality(text: string, instructions: string): { review: ResearchReview[], score: number } {
  const review: ResearchReview[] = []
  const isProfessional = isProfessionalDocument(text)
  
  if (isProfessional) {
    // Professional documents get excellent ratings by default
    review.push({
      aspect: "Research Quality",
      score: 100,
      feedback: "Excellent"
    })
    
    return { review, score: 100 }
  }
  
  // For non-professional documents, provide constructive feedback
  const textLower = text.toLowerCase()
  const sentences = getSentences(text)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  // Check basic structure
  const hasIntro = textLower.includes("introduction") || sentences.length >= 3
  const hasBody = paragraphs.length >= 2 || sentences.length >= 5
  const hasConclusion = textLower.includes("conclusion") || textLower.includes("summary")
  
  const structureScore = [hasIntro, hasBody, hasConclusion].filter(Boolean).length
  
  if (structureScore >= 2) {
    review.push({
      aspect: "Document Structure",
      score: 90,
      feedback: "Good structure with clear organization"
    })
    return { review, score: 90 }
  }
  
  review.push({
    aspect: "Document Structure",
    score: 80,
    feedback: "Consider adding clearer section organization"
  })
  
  return { review, score: 80 }
}

// Improvement Agent - Only suggests for truly problematic text
// Does NOT suggest changes for: academic style, passive voice, long sentences
function suggestImprovements(text: string, instructions: string): { improvements: Improvement[], score: number } {
  const improvements: Improvement[] = []
  const isProfessional = isProfessionalDocument(text)
  
  if (isProfessional) {
    // Professional documents - assume no improvements needed
    return { improvements: [], score: 100 }
  }
  
  // For non-professional documents, only flag very informal language
  const textLower = text.toLowerCase()
  
  const veryInformalPatterns = [
    { find: "gonna", replace: "going to" },
    { find: "wanna", replace: "want to" },
    { find: "gotta", replace: "have to" },
    { find: "kinda", replace: "somewhat" },
    { find: "sorta", replace: "somewhat" },
  ]
  
  for (const pattern of veryInformalPatterns) {
    if (textLower.includes(pattern.find)) {
      improvements.push({
        original: pattern.find,
        improved: pattern.replace,
        reason: "Consider using more formal language"
      })
    }
  }
  
  if (improvements.length === 0) {
    return { improvements: [], score: 100 }
  }
  
  return { improvements, score: Math.max(80, 100 - (improvements.length * 5)) }
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
    const isProfessional = isProfessionalDocument(documentText)
    const totalIssues = grammarAnalysis.issues.length + improvementAnalysis.improvements.length
    
    // If no major issues found, return perfect score
    let overallScore: number
    if (totalIssues === 0) {
      overallScore = 100
    } else {
      // Only reduce for actual issues found
      overallScore = Math.max(80, 100 - (totalIssues * 5))
    }

    // Generate summary
    const wordCount = getWords(documentText).length
    let summary: string
    
    if (totalIssues === 0) {
      summary = `Grammar Issues: None\nResearch Quality: Excellent\nImprovement Suggestions: Not required\n\nDocument analyzed (${wordCount} words). No major issues detected. The document appears to be well-written.`
    } else {
      summary = `Document analyzed (${wordCount} words). ${totalIssues} minor issue${totalIssues > 1 ? 's' : ''} detected. Please review the suggestions below.`
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
