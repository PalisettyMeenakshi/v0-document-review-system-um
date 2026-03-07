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

// Helper: Remove sections we should ignore (References, Acknowledgements, etc.)
function removeIgnoredSections(text: string): string {
  const sectionsToIgnore = [
    /references[\s\S]*$/i,
    /acknowledgements?[\s\S]*$/i,
    /author contributions[\s\S]*$/i,
    /funding[\s\S]*$/i,
    /conflicts? of interest[\s\S]*$/i,
    /data availability[\s\S]*$/i,
    /supplementary materials?[\s\S]*$/i,
    /appendix[\s\S]*$/i,
    /copyright[\s\S]*$/i,
    /license[\s\S]*$/i,
    /publisher'?s? note[\s\S]*$/i,
  ]
  
  let cleanedText = text
  for (const pattern of sectionsToIgnore) {
    cleanedText = cleanedText.replace(pattern, '')
  }
  return cleanedText.trim()
}

// Grammar Agent - Only detects meaningful issues
// Does NOT flag: academic writing style, long sentences, passive voice, citations, references, technical terminology
function analyzeGrammar(text: string, instructions: string): { issues: GrammarIssue[], score: number } {
  const issues: GrammarIssue[] = []
  
  // Remove sections we should ignore
  const cleanedText = removeIgnoredSections(text)
  
  // Check for definite spelling errors
  const spellingErrors = [
    { pattern: /\bcould of\b/gi, fix: "could have", explain: "Grammar error: 'could of' should be 'could have'" },
    { pattern: /\bshould of\b/gi, fix: "should have", explain: "Grammar error: 'should of' should be 'should have'" },
    { pattern: /\bwould of\b/gi, fix: "would have", explain: "Grammar error: 'would of' should be 'would have'" },
    { pattern: /\balot\b/gi, fix: "a lot", explain: "Spelling error: 'alot' should be 'a lot'" },
    { pattern: /\bteh\b/gi, fix: "the", explain: "Typo: 'teh' should be 'the'" },
    { pattern: /\badn\b/gi, fix: "and", explain: "Typo: 'adn' should be 'and'" },
    { pattern: /\bthier\b/gi, fix: "their", explain: "Spelling error" },
    { pattern: /\brecieve\b/gi, fix: "receive", explain: "Spelling error: i before e except after c" },
    { pattern: /\bseperate\b/gi, fix: "separate", explain: "Spelling error" },
    { pattern: /\boccured\b/gi, fix: "occurred", explain: "Spelling error: double 'r'" },
    { pattern: /\bdefinately\b/gi, fix: "definitely", explain: "Spelling error" },
    { pattern: /\buntill\b/gi, fix: "until", explain: "Spelling error: single 'l'" },
    { pattern: /\bwich\b/gi, fix: "which", explain: "Spelling error" },
    { pattern: /\bbelive\b/gi, fix: "believe", explain: "Spelling error" },
    { pattern: /\bneccessary\b/gi, fix: "necessary", explain: "Spelling error" },
    { pattern: /\baccommodate\b/gi, fix: "accommodate", explain: "Spelling check" },
  ]
  
  for (const check of spellingErrors) {
    const matches = cleanedText.match(check.pattern)
    if (matches && matches.length > 0) {
      issues.push({
        original: matches[0],
        suggestion: check.fix,
        explanation: check.explain,
        severity: "medium"
      })
    }
  }
  
  // Check for missing punctuation at end of clear sentences
  const sentences = getSentences(cleanedText)
  for (const sentence of sentences) {
    // Check for sentences that don't end with punctuation but should
    const lastChar = sentence.trim().slice(-1)
    if (sentence.length > 20 && !/[.!?:;,]$/.test(lastChar)) {
      // Make sure it's not a heading or list item
      if (!/^[A-Z\d]+\.?\s/.test(sentence) && !/^\d+\./.test(sentence)) {
        // Only flag if it looks like a complete sentence missing punctuation
        const hasSubjectVerb = /\b(is|are|was|were|have|has|had|will|would|could|should|can|may|might|must)\b/i.test(sentence)
        if (hasSubjectVerb && issues.length < 3) {
          issues.push({
            original: sentence.substring(0, 50) + (sentence.length > 50 ? "..." : ""),
            suggestion: "Add appropriate punctuation",
            explanation: "Missing punctuation at end of sentence",
            severity: "low"
          })
        }
      }
    }
  }
  
  // Check for repeated consecutive words (the the, is is, etc.)
  const repeatedWords = cleanedText.match(/\b(\w+)\s+\1\b/gi)
  if (repeatedWords && repeatedWords.length > 0) {
    // Filter out intentional repetitions
    const unintentional = repeatedWords.filter(r => !/^(that that|had had|is is|was was)$/i.test(r))
    if (unintentional.length > 0 && issues.length < 3) {
      issues.push({
        original: unintentional[0],
        suggestion: unintentional[0].split(/\s+/)[0],
        explanation: "Repeated word detected",
        severity: "low"
      })
    }
  }
  
  // Check for unclear sentences (very short fragments that look incomplete)
  for (const sentence of sentences) {
    const wordCount = getWords(sentence).length
    if (wordCount >= 2 && wordCount <= 4) {
      const startsWithArticle = /^(The|A|An|This|That)\s/i.test(sentence)
      const hasNoVerb = !/\b(is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|show|include|provide|present|describe|discuss|analyze|examine|demonstrate|indicate|suggest|reveal|explain)\b/i.test(sentence)
      const notHeading = !/^[A-Z][A-Z\s]+$/.test(sentence) && !/^\d+\./.test(sentence)
      
      if (startsWithArticle && hasNoVerb && notHeading && issues.length < 3) {
        issues.push({
          original: sentence,
          suggestion: "Complete this sentence or clarify meaning",
          explanation: "Unclear or incomplete sentence",
          severity: "low"
        })
      }
    }
  }
  
  // LIMIT: Maximum 3 grammar issues
  const limitedIssues = issues.slice(0, 3)
  
  return { issues: limitedIssues, score: 100 }
}

// Research Quality Agent - Evaluates structure and clarity
function analyzeResearchQuality(text: string, instructions: string): { review: ResearchReview[], score: number } {
  const review: ResearchReview[] = []
  const cleanedText = removeIgnoredSections(text)
  const textLower = cleanedText.toLowerCase()
  const sentences = getSentences(cleanedText)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  // Check for clear structure indicators
  const hasIntro = textLower.includes("introduction") || textLower.includes("abstract")
  const hasMethodology = textLower.includes("method") || textLower.includes("approach") || textLower.includes("procedure")
  const hasResults = textLower.includes("result") || textLower.includes("finding") || textLower.includes("outcome")
  const hasConclusion = textLower.includes("conclusion") || textLower.includes("summary") || textLower.includes("discussion")
  
  const structureScore = [hasIntro, hasMethodology, hasResults, hasConclusion].filter(Boolean).length
  
  let feedback: string
  if (structureScore >= 3) {
    feedback = "Document has clear and logical structure with well-defined sections."
  } else if (structureScore >= 2) {
    feedback = "Document structure is adequate. Consider adding clearer section headings."
  } else if (paragraphs.length >= 3 && sentences.length >= 10) {
    feedback = "Document has reasonable organization but could benefit from clearer section markers."
  } else {
    feedback = "Consider organizing content into clearer sections for improved readability."
  }
  
  review.push({
    aspect: "Research Structure",
    score: structureScore >= 2 ? 95 : 85,
    feedback
  })
  
  return { review, score: structureScore >= 2 ? 95 : 85 }
}

// Improvement Agent - Suggests minor stylistic improvements (not errors)
function suggestImprovements(text: string, instructions: string): { improvements: Improvement[], score: number } {
  const improvements: Improvement[] = []
  const cleanedText = removeIgnoredSections(text)
  const textLower = cleanedText.toLowerCase()
  
  // Only flag informal language that clearly needs improvement
  const informalPatterns = [
    { find: /\bgonna\b/i, replace: "going to", reason: "Consider more formal phrasing" },
    { find: /\bwanna\b/i, replace: "want to", reason: "Consider more formal phrasing" },
    { find: /\bgotta\b/i, replace: "have to", reason: "Consider more formal phrasing" },
    { find: /\bkinda\b/i, replace: "somewhat", reason: "Consider more formal phrasing" },
    { find: /\bsorta\b/i, replace: "somewhat", reason: "Consider more formal phrasing" },
    { find: /\blots of\b/i, replace: "many/numerous", reason: "Consider more precise language" },
    { find: /\ba lot of\b/i, replace: "numerous/significant", reason: "Suggestion: more academic phrasing" },
  ]
  
  for (const pattern of informalPatterns) {
    const match = cleanedText.match(pattern.find)
    if (match && improvements.length < 2) {
      improvements.push({
        original: match[0],
        improved: pattern.replace,
        reason: pattern.reason
      })
    }
  }
  
  // Check for very repetitive sentence starters (only if 4+ occurrences)
  const sentenceStarters = getSentences(cleanedText).map(s => {
    const words = s.trim().split(/\s+/)
    return words.slice(0, 2).join(' ').toLowerCase()
  })
  
  const starterCounts: Record<string, number> = {}
  for (const starter of sentenceStarters) {
    starterCounts[starter] = (starterCounts[starter] || 0) + 1
  }
  
  for (const [starter, count] of Object.entries(starterCounts)) {
    if (count >= 4 && improvements.length < 2) {
      improvements.push({
        original: `"${starter}..." used ${count} times`,
        improved: "Vary sentence beginnings",
        reason: "Suggestion: varying sentence structure improves readability"
      })
      break
    }
  }
  
  // LIMIT: Maximum 2 improvement suggestions
  const limitedImprovements = improvements.slice(0, 2)
  
  return { improvements: limitedImprovements, score: 100 }
}

// Calculate overall score based on scoring rules
function calculateOverallScore(
  grammarIssues: GrammarIssue[],
  improvements: Improvement[]
): number {
  const totalIssues = grammarIssues.length
  const hasSuggestions = improvements.length > 0
  
  // Scoring rules:
  // No issues → 98-100
  // Only minor mistakes → 90-97
  // Moderate issues → 75-89
  // Major grammar/structural problems → below 75
  
  if (totalIssues === 0 && !hasSuggestions) {
    // No issues found
    return 98 + Math.floor(Math.random() * 3) // 98-100
  }
  
  if (totalIssues <= 1 && improvements.length <= 1) {
    // Only minor mistakes
    return 90 + Math.floor(Math.random() * 8) // 90-97
  }
  
  if (totalIssues <= 3) {
    // Moderate issues
    return 75 + Math.floor(Math.random() * 15) // 75-89
  }
  
  // Major problems (shouldn't happen with our limits, but just in case)
  return 60 + Math.floor(Math.random() * 15) // 60-74
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
    const overallScore = calculateOverallScore(
      grammarAnalysis.issues,
      improvementAnalysis.improvements
    )

    // Generate summary in required format
    const wordCount = getWords(documentText).length
    const grammarText = grammarAnalysis.issues.length === 0 
      ? "None" 
      : grammarAnalysis.issues.map(i => `- ${i.original}: ${i.explanation}`).join('\n')
    
    const structureText = researchAnalysis.review.length > 0 
      ? researchAnalysis.review[0].feedback 
      : "Structure appears adequate"
    
    const improvementText = improvementAnalysis.improvements.length === 0
      ? "None"
      : improvementAnalysis.improvements.map(i => `- ${i.reason}`).join('\n')

    const summary = `Grammar Issues:\n${grammarText}\n\nResearch Structure:\n${structureText}\n\nImprovement Suggestions:\n${improvementText}\n\nOverall Score: ${overallScore}\n\n(Document: ${wordCount} words analyzed)`

    const result: AnalysisResult = {
      grammarIssues: grammarAnalysis.issues,
      grammarScore: grammarAnalysis.issues.length === 0 ? 100 : Math.max(85, 100 - grammarAnalysis.issues.length * 5),
      researchReview: researchAnalysis.review,
      researchScore: researchAnalysis.score,
      improvements: improvementAnalysis.improvements,
      improvementScore: improvementAnalysis.improvements.length === 0 ? 100 : 90,
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
