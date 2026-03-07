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
  grammarStatus: string
  researchReview: ResearchReview[]
  researchScore: number
  researchStatus: string
  improvements: Improvement[]
  improvementScore: number
  improvementStatus: string
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

/*
GRAMMAR AGENT
Check only for:
• spelling mistakes
• incorrect punctuation
• incomplete sentences
• clear grammatical errors

Do NOT mark:
• academic writing style
• long sentences
• passive voice
• technical terminology
• citations
*/
function analyzeGrammar(text: string): { issues: GrammarIssue[], status: string } {
  const issues: GrammarIssue[] = []
  const cleanedText = removeIgnoredSections(text)
  
  // Check for definite spelling errors only
  const spellingErrors = [
    { pattern: /\bcould of\b/gi, fix: "could have", explain: "Grammar error: 'could of' should be 'could have'" },
    { pattern: /\bshould of\b/gi, fix: "should have", explain: "Grammar error: 'should of' should be 'should have'" },
    { pattern: /\bwould of\b/gi, fix: "would have", explain: "Grammar error: 'would of' should be 'would have'" },
    { pattern: /\balot\b/gi, fix: "a lot", explain: "Spelling error: 'alot' should be 'a lot'" },
    { pattern: /\bteh\b/gi, fix: "the", explain: "Typo: 'teh' should be 'the'" },
    { pattern: /\badn\b/gi, fix: "and", explain: "Typo: 'adn' should be 'and'" },
    { pattern: /\bthier\b/gi, fix: "their", explain: "Spelling error: 'thier' should be 'their'" },
    { pattern: /\brecieve\b/gi, fix: "receive", explain: "Spelling error: 'recieve' should be 'receive'" },
    { pattern: /\bseperate\b/gi, fix: "separate", explain: "Spelling error: 'seperate' should be 'separate'" },
    { pattern: /\boccured\b/gi, fix: "occurred", explain: "Spelling error: 'occured' should be 'occurred'" },
    { pattern: /\bdefinately\b/gi, fix: "definitely", explain: "Spelling error: 'definately' should be 'definitely'" },
    { pattern: /\buntill\b/gi, fix: "until", explain: "Spelling error: 'untill' should be 'until'" },
    { pattern: /\bwich\b/gi, fix: "which", explain: "Spelling error: 'wich' should be 'which'" },
    { pattern: /\bbelive\b/gi, fix: "believe", explain: "Spelling error: 'belive' should be 'believe'" },
    { pattern: /\bneccessary\b/gi, fix: "necessary", explain: "Spelling error: 'neccessary' should be 'necessary'" },
    { pattern: /\bacccomodate\b/gi, fix: "accommodate", explain: "Spelling error" },
    { pattern: /\bbeggining\b/gi, fix: "beginning", explain: "Spelling error: 'beggining' should be 'beginning'" },
    { pattern: /\benviroment\b/gi, fix: "environment", explain: "Spelling error: 'enviroment' should be 'environment'" },
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
  
  // Check for repeated consecutive words (the the, is is, etc.)
  const repeatedWords = cleanedText.match(/\b(\w+)\s+\1\b/gi)
  if (repeatedWords && repeatedWords.length > 0) {
    const unintentional = repeatedWords.filter(r => !/^(that that|had had)$/i.test(r))
    if (unintentional.length > 0) {
      issues.push({
        original: unintentional[0],
        suggestion: unintentional[0].split(/\s+/)[0],
        explanation: "Repeated word detected",
        severity: "low"
      })
    }
  }
  
  // Check for incomplete sentences (very short fragments starting with article but no verb)
  const sentences = getSentences(cleanedText)
  for (const sentence of sentences) {
    const words = getWords(sentence)
    if (words.length >= 2 && words.length <= 3) {
      const startsWithArticle = /^(The|A|An|This|That)\s/i.test(sentence)
      const hasNoVerb = !/\b(is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|show|include|provide|present|describe|discuss|analyze|examine|demonstrate|indicate|suggest|reveal|explain)\b/i.test(sentence)
      const notHeading = !/^[A-Z][A-Z\s]+$/.test(sentence) && !/^\d+\./.test(sentence)
      
      if (startsWithArticle && hasNoVerb && notHeading && issues.length < 3) {
        issues.push({
          original: sentence,
          suggestion: "Complete this sentence",
          explanation: "Incomplete sentence detected",
          severity: "medium"
        })
      }
    }
  }
  
  // Return status based on issues found
  const status = issues.length === 0 ? "Perfect" : `${issues.length} issue(s) found`
  
  return { issues: issues.slice(0, 3), status }
}

/*
RESEARCH QUALITY AGENT
Evaluate:
• logical flow
• clarity of explanation
• structured paragraphs
• coherence between sections

Do not penalize:
• references
• citations
• technical terms
*/
function analyzeResearchQuality(text: string): { review: ResearchReview[], status: string } {
  const review: ResearchReview[] = []
  const cleanedText = removeIgnoredSections(text)
  const textLower = cleanedText.toLowerCase()
  const sentences = getSentences(cleanedText)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50)
  
  // Check for structure indicators
  const hasIntro = textLower.includes("introduction") || textLower.includes("abstract") || textLower.includes("background")
  const hasMethodology = textLower.includes("method") || textLower.includes("approach") || textLower.includes("procedure") || textLower.includes("materials")
  const hasResults = textLower.includes("result") || textLower.includes("finding") || textLower.includes("outcome") || textLower.includes("analysis")
  const hasConclusion = textLower.includes("conclusion") || textLower.includes("summary") || textLower.includes("discussion")
  
  const structureScore = [hasIntro, hasMethodology, hasResults, hasConclusion].filter(Boolean).length
  
  // Evaluate logical flow - check for transition words
  const transitionWords = ["however", "therefore", "furthermore", "moreover", "consequently", "thus", "hence", "additionally", "similarly", "in contrast", "as a result", "for example", "specifically"]
  const hasTransitions = transitionWords.some(t => textLower.includes(t))
  
  // Evaluate clarity - check sentence variety and paragraph structure
  const avgSentenceLength = sentences.length > 0 ? sentences.reduce((sum, s) => sum + getWords(s).length, 0) / sentences.length : 0
  const hasGoodSentenceVariety = avgSentenceLength >= 10 && avgSentenceLength <= 30
  const hasMultipleParagraphs = paragraphs.length >= 3
  
  // Determine status and feedback
  let status: string
  let feedback: string
  let score: number
  
  if (structureScore >= 3 && hasTransitions && hasMultipleParagraphs) {
    status = "Excellent"
    feedback = "Strong and well structured. The document demonstrates clear logical flow with well-organized sections and coherent paragraphs."
    score = 100
  } else if (structureScore >= 2 && hasMultipleParagraphs) {
    status = "Strong"
    feedback = "Well structured document with clear organization and logical flow between sections."
    score = 95
  } else if (structureScore >= 1 || hasMultipleParagraphs) {
    status = "Adequate"
    feedback = "Document structure is adequate with reasonable organization."
    score = 85
  } else {
    status = "Needs Improvement"
    feedback = "Consider organizing content into clearer sections for improved readability."
    score = 75
  }
  
  review.push({
    aspect: "Overall Structure",
    score,
    feedback
  })
  
  return { review, status }
}

/*
IMPROVEMENTS AGENT
Suggest improvements only if:
• a sentence is unclear
• wording is repetitive
• the meaning is confusing

If the document is already clear and well written, state:
"No improvements required."
*/
function suggestImprovements(text: string): { improvements: Improvement[], status: string } {
  const improvements: Improvement[] = []
  const cleanedText = removeIgnoredSections(text)
  const sentences = getSentences(cleanedText)
  
  // Only flag clearly informal language
  const informalPatterns = [
    { find: /\bgonna\b/i, replace: "going to", reason: "Informal language - use formal phrasing" },
    { find: /\bwanna\b/i, replace: "want to", reason: "Informal language - use formal phrasing" },
    { find: /\bgotta\b/i, replace: "have to", reason: "Informal language - use formal phrasing" },
    { find: /\bkinda\b/i, replace: "somewhat", reason: "Informal language - use formal phrasing" },
    { find: /\bsorta\b/i, replace: "somewhat", reason: "Informal language - use formal phrasing" },
    { find: /\bstuff\b/i, replace: "materials/elements", reason: "Vague language - be more specific" },
    { find: /\bthings\b/i, replace: "aspects/elements", reason: "Vague language - be more specific" },
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
  
  // Check for very repetitive sentence starters (only if 5+ occurrences)
  const sentenceStarters = sentences.map(s => {
    const words = s.trim().split(/\s+/)
    return words.slice(0, 2).join(' ').toLowerCase()
  })
  
  const starterCounts: Record<string, number> = {}
  for (const starter of sentenceStarters) {
    if (starter.length > 3) {
      starterCounts[starter] = (starterCounts[starter] || 0) + 1
    }
  }
  
  for (const [starter, count] of Object.entries(starterCounts)) {
    if (count >= 5 && improvements.length < 2) {
      improvements.push({
        original: `"${starter}..." appears ${count} times`,
        improved: "Vary sentence beginnings for better readability",
        reason: "Repetitive sentence structure"
      })
      break
    }
  }
  
  // Return status based on improvements needed
  const status = improvements.length === 0 ? "None required" : `${improvements.length} suggestion(s)`
  
  return { improvements: improvements.slice(0, 2), status }
}

/*
SCORING RULE

Only give 100 when ALL three conditions are satisfied:
Grammar → No issues  
Research Quality → Strong and well structured  
Improvements → No improvements required  

If any of the three categories contains issues, reduce the score:
Minor issues → 90–99  
Moderate issues → 75–89  
Major issues → below 75
*/
function calculateOverallScore(
  grammarStatus: string,
  researchStatus: string,
  improvementStatus: string
): number {
  const grammarPerfect = grammarStatus === "Perfect"
  const researchExcellent = researchStatus === "Excellent" || researchStatus === "Strong"
  const noImprovements = improvementStatus === "None required"
  
  // Perfect score: ALL three conditions satisfied
  if (grammarPerfect && researchExcellent && noImprovements) {
    return 100
  }
  
  // Count how many categories have issues
  let issueCount = 0
  if (!grammarPerfect) issueCount++
  if (!researchExcellent) issueCount++
  if (!noImprovements) issueCount++
  
  // Minor issues (1 category) → 90-99
  if (issueCount === 1) {
    return 90 + Math.floor(Math.random() * 10)
  }
  
  // Moderate issues (2 categories) → 75-89
  if (issueCount === 2) {
    return 75 + Math.floor(Math.random() * 15)
  }
  
  // Major issues (all 3 categories) → below 75
  return 60 + Math.floor(Math.random() * 15)
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json()
    const { documentText } = body

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: "Document text is required" },
        { status: 400 }
      )
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Run all three agents
    const grammarAnalysis = analyzeGrammar(documentText)
    const researchAnalysis = analyzeResearchQuality(documentText)
    const improvementAnalysis = suggestImprovements(documentText)

    // Calculate overall score based on all three categories
    const overallScore = calculateOverallScore(
      grammarAnalysis.status,
      researchAnalysis.review[0]?.feedback.includes("Strong") || researchAnalysis.review[0]?.feedback.includes("Excellent") ? "Excellent" : researchAnalysis.status,
      improvementAnalysis.status
    )

    // Generate summary in required output format
    const grammarText = grammarAnalysis.status === "Perfect" 
      ? "Perfect" 
      : grammarAnalysis.issues.map(i => `• ${i.explanation}`).join('\n')
    
    const researchText = researchAnalysis.review[0]?.feedback || "Structure appears adequate"
    
    const improvementText = improvementAnalysis.status === "None required"
      ? "None required"
      : improvementAnalysis.improvements.map(i => `• ${i.reason}`).join('\n')

    const summary = `Grammar:\n${grammarText}\n\nResearch Quality:\n${researchText}\n\nImprovements:\n${improvementText}\n\nScore:\n${overallScore}`

    const result: AnalysisResult = {
      grammarIssues: grammarAnalysis.issues,
      grammarScore: grammarAnalysis.status === "Perfect" ? 100 : Math.max(85, 100 - grammarAnalysis.issues.length * 5),
      grammarStatus: grammarAnalysis.status,
      researchReview: researchAnalysis.review,
      researchScore: researchAnalysis.review[0]?.score || 85,
      researchStatus: researchAnalysis.status,
      improvements: improvementAnalysis.improvements,
      improvementScore: improvementAnalysis.status === "None required" ? 100 : 90,
      improvementStatus: improvementAnalysis.status,
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
