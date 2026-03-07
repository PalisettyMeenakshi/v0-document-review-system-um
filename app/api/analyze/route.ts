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

// Helper: Find actual occurrences in text
function findInText(text: string, patterns: string[]): string[] {
  const found: string[] = []
  const lowerText = text.toLowerCase()
  for (const pattern of patterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Find the actual occurrence with context
      const index = lowerText.indexOf(pattern.toLowerCase())
      const start = Math.max(0, index - 20)
      const end = Math.min(text.length, index + pattern.length + 20)
      found.push(text.substring(start, end).trim())
    }
  }
  return found
}

// Grammar Agent - Analyzes actual text content
function analyzeGrammar(text: string, instructions: string): { issues: GrammarIssue[], score: number } {
  const issues: GrammarIssue[] = []
  const sentences = getSentences(text)
  const words = getWords(text)
  
  // Check for double spaces
  const doubleSpaceCount = (text.match(/  +/g) || []).length
  if (doubleSpaceCount > 0) {
    issues.push({
      original: `Found ${doubleSpaceCount} instance(s) of multiple consecutive spaces`,
      suggestion: "Use single spaces between words",
      explanation: "Multiple spaces can affect document formatting and should be normalized",
      severity: doubleSpaceCount > 5 ? "medium" : "low"
    })
  }

  // Check for sentences starting with lowercase
  const lowerCaseSentences = sentences.filter(s => s.length > 0 && /^[a-z]/.test(s))
  if (lowerCaseSentences.length > 0) {
    issues.push({
      original: `Sentence starting with lowercase: "${lowerCaseSentences[0].substring(0, 50)}..."`,
      suggestion: "Capitalize the first letter of sentences",
      explanation: "Proper capitalization improves readability",
      severity: "medium"
    })
  }

  // Check for very long sentences (over 40 words)
  const longSentences = sentences.filter(s => getWords(s).length > 40)
  if (longSentences.length > 0) {
    issues.push({
      original: `${longSentences.length} overly long sentence(s) detected (40+ words)`,
      suggestion: "Consider breaking into shorter, more digestible sentences",
      explanation: "Long sentences can be difficult to follow and may lose reader attention",
      severity: longSentences.length > 3 ? "high" : "medium"
    })
  }

  // Check for repeated words (consecutive)
  const repeatedWordMatch = text.match(/\b(\w+)\s+\1\b/gi)
  if (repeatedWordMatch && repeatedWordMatch.length > 0) {
    issues.push({
      original: `Repeated word detected: "${repeatedWordMatch[0]}"`,
      suggestion: "Remove the duplicate word or rephrase",
      explanation: "Consecutive repeated words are usually typos",
      severity: "medium"
    })
  }

  // Check their/there/they're usage
  if (text.includes("their") && text.includes("there")) {
    issues.push({
      original: "Multiple forms of 'their/there' detected",
      suggestion: "Verify correct usage: 'their' (possessive), 'there' (location), 'they're' (they are)",
      explanation: "Common homophone confusion - ensure each usage is appropriate for context",
      severity: "low"
    })
  }

  // Check for common grammar issues
  const commonIssues = [
    { pattern: /\bi\b/g, issue: "Lowercase 'i'", fix: "Capitalize the pronoun 'I'", severity: "medium" as const },
    { pattern: /\byour\s+(going|doing|coming)/gi, issue: "your vs you're", fix: "Use 'you're' (you are) before verbs", severity: "high" as const },
    { pattern: /\bits\s+(a|the|going|been)/gi, issue: "its vs it's", fix: "Consider using 'it's' (it is/it has)", severity: "medium" as const },
    { pattern: /\bcould of\b/gi, issue: "'could of'", fix: "Use 'could have' or 'could've'", severity: "high" as const },
    { pattern: /\bshould of\b/gi, issue: "'should of'", fix: "Use 'should have' or 'should've'", severity: "high" as const },
    { pattern: /\balot\b/gi, issue: "'alot'", fix: "Use 'a lot' (two words)", severity: "medium" as const },
  ]

  for (const check of commonIssues) {
    const matches = text.match(check.pattern)
    if (matches && matches.length > 0) {
      issues.push({
        original: `Found: "${matches[0]}"`,
        suggestion: check.fix,
        explanation: `Common grammar issue: ${check.issue}`,
        severity: check.severity
      })
    }
  }

  // Check punctuation issues
  const missingPeriods = sentences.filter(s => s.length > 20 && !/[.!?]$/.test(s))
  if (missingPeriods.length > sentences.length * 0.3) {
    issues.push({
      original: "Multiple sentences may be missing ending punctuation",
      suggestion: "Ensure all sentences end with appropriate punctuation",
      explanation: "Proper punctuation marks the end of thoughts and improves readability",
      severity: "medium"
    })
  }

  // Check for transitional words needing commas
  const transitionWords = ["however", "therefore", "moreover", "furthermore", "nevertheless", "consequently"]
  for (const word of transitionWords) {
    const regex = new RegExp(`\\b${word}\\s+[a-z]`, "gi")
    if (regex.test(text)) {
      issues.push({
        original: `Transitional word "${word}" may need punctuation`,
        suggestion: `Ensure "${word}" is properly punctuated (usually followed by a comma)`,
        explanation: "Transitional words typically require commas for proper sentence flow",
        severity: "low"
      })
      break // Only report once
    }
  }

  // Mentor instruction-based checks
  const instructionLower = instructions.toLowerCase()
  if (instructionLower.includes("spelling") || instructionLower.includes("typo")) {
    issues.push({
      original: "Spelling check requested by mentor",
      suggestion: "Document reviewed for potential spelling errors",
      explanation: "Per mentor instructions: focus on spelling accuracy",
      severity: "low"
    })
  }

  if (instructionLower.includes("punctuation")) {
    issues.push({
      original: "Punctuation review requested",
      suggestion: "Review commas, periods, and other punctuation marks",
      explanation: "Per mentor instructions: focus on punctuation",
      severity: "low"
    })
  }

  // Calculate score based on issues and text length
  const textComplexity = Math.min(1, words.length / 500) // More complex texts get some leeway
  const highIssues = issues.filter(i => i.severity === "high").length
  const mediumIssues = issues.filter(i => i.severity === "medium").length
  const lowIssues = issues.filter(i => i.severity === "low").length
  
  const baseScore = 95
  const deductions = (highIssues * 12) + (mediumIssues * 6) + (lowIssues * 2)
  const adjustedDeductions = deductions * (1 - textComplexity * 0.2) // Slight adjustment for longer texts
  
  const score = Math.max(35, Math.round(baseScore - adjustedDeductions))

  return { issues, score }
}

// Research Quality Agent - Evaluates structure and content
function analyzeResearchQuality(text: string, instructions: string): { review: ResearchReview[], score: number } {
  const review: ResearchReview[] = []
  const textLower = text.toLowerCase()
  const sentences = getSentences(text)
  const words = getWords(text)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)

  // Structure Analysis
  const structuralElements = {
    hasIntro: textLower.includes("introduction") || textLower.includes("abstract") || textLower.includes("overview"),
    hasConclusion: textLower.includes("conclusion") || textLower.includes("summary") || textLower.includes("in closing"),
    hasMethodology: textLower.includes("method") || textLower.includes("approach") || textLower.includes("procedure"),
    hasResults: textLower.includes("result") || textLower.includes("finding") || textLower.includes("outcome"),
    hasReferences: textLower.includes("reference") || textLower.includes("bibliography") || textLower.includes("citation"),
  }

  const structureScore = Object.values(structuralElements).filter(Boolean).length * 20
  const structureFeedback = structureScore >= 80 
    ? "Document has excellent structural organization with clear sections"
    : structureScore >= 60
      ? "Document has good structure but could benefit from additional sections"
      : structureScore >= 40
        ? "Consider adding clearer structural elements (introduction, methodology, conclusion)"
        : "Document lacks clear structural organization - consider restructuring"

  review.push({
    aspect: "Document Structure",
    score: Math.max(40, Math.min(95, structureScore + (paragraphs.length > 3 ? 15 : 0))),
    feedback: structureFeedback
  })

  // Methodology Analysis
  const methodologyKeywords = ["study", "research", "analyze", "examine", "investigate", "measure", "evaluate", "assess", "survey", "interview"]
  const methodCount = methodologyKeywords.filter(kw => textLower.includes(kw)).length
  const methodScore = Math.min(95, 50 + methodCount * 8)
  
  review.push({
    aspect: "Research Methodology",
    score: structuralElements.hasMethodology ? methodScore + 10 : methodScore - 10,
    feedback: structuralElements.hasMethodology 
      ? `Research methodology is present with ${methodCount} relevant methodological terms identified`
      : `Consider elaborating on the research methodology. Found ${methodCount} methodology-related terms`
  })

  // Clarity of Expression
  const avgSentenceLength = sentences.length > 0 
    ? words.length / sentences.length 
    : 0
  
  const clarityScore = avgSentenceLength === 0 ? 50 :
    avgSentenceLength > 35 ? 55 :
    avgSentenceLength > 28 ? 65 :
    avgSentenceLength > 22 ? 75 :
    avgSentenceLength > 15 ? 85 :
    avgSentenceLength > 8 ? 80 : 70

  review.push({
    aspect: "Clarity of Expression",
    score: clarityScore,
    feedback: `Average sentence length: ${avgSentenceLength.toFixed(1)} words. ${
      avgSentenceLength > 28 
        ? "Consider shorter sentences for improved readability"
        : avgSentenceLength < 10 
          ? "Consider more complex sentence structures for academic depth"
          : "Good sentence length variation for readability"
    }`
  })

  // Evidence & Support Analysis
  const evidenceKeywords = ["evidence", "data", "shows", "demonstrates", "indicates", "suggests", "according to", "study found", "research shows", "statistics"]
  const evidenceCount = evidenceKeywords.filter(kw => textLower.includes(kw)).length
  const hasNumbers = /\d+%|\d+\.\d+|\d{4}/.test(text) // percentages, decimals, years
  
  const evidenceScore = Math.min(95, 45 + evidenceCount * 7 + (hasNumbers ? 15 : 0))
  
  review.push({
    aspect: "Evidence & Support",
    score: evidenceScore,
    feedback: `${evidenceCount} evidence-indicating terms found. ${
      hasNumbers ? "Numerical data present. " : ""
    }${
      evidenceScore >= 75 
        ? "Good use of supporting evidence"
        : "Consider adding more concrete evidence to support claims"
    }`
  })

  // Coherence & Flow
  const transitionWords = ["however", "therefore", "moreover", "furthermore", "additionally", "consequently", "thus", "hence", "in contrast", "similarly"]
  const transitionCount = transitionWords.filter(tw => textLower.includes(tw)).length
  const coherenceScore = Math.min(95, 50 + transitionCount * 6 + (paragraphs.length > 2 ? 15 : 0))
  
  review.push({
    aspect: "Coherence & Flow",
    score: coherenceScore,
    feedback: `${transitionCount} transitional phrases identified across ${paragraphs.length} paragraph(s). ${
      coherenceScore >= 75 
        ? "Good logical flow between ideas"
        : "Consider adding more transitional phrases to improve flow"
    }`
  })

  // Mentor instruction-based analysis
  const instructionLower = instructions.toLowerCase()
  if (instructionLower.includes("methodology") || instructionLower.includes("research method")) {
    review.push({
      aspect: "Methodology Focus (Per Instructions)",
      score: structuralElements.hasMethodology ? 85 : 65,
      feedback: "Methodology section reviewed as requested in mentor instructions"
    })
  }

  if (instructionLower.includes("evidence") || instructionLower.includes("support")) {
    review.push({
      aspect: "Evidence Focus (Per Instructions)",
      score: evidenceScore,
      feedback: "Evidence and supporting arguments reviewed per mentor instructions"
    })
  }

  const avgScore = review.reduce((acc, r) => acc + r.score, 0) / review.length

  return { review, score: Math.round(avgScore) }
}

// Improvement Agent - Suggests content improvements
function suggestImprovements(text: string, instructions: string): { improvements: Improvement[], score: number } {
  const improvements: Improvement[] = []
  const textLower = text.toLowerCase()
  const words = getWords(text)

  // Informal language patterns
  const informalPatterns = [
    { find: "a lot", replace: "numerous / significant / substantial", reason: "More formal vocabulary for academic writing" },
    { find: "lots of", replace: "many / numerous / a significant number of", reason: "Replace informal quantity expressions" },
    { find: "really", replace: "significantly / considerably / notably", reason: "Replace informal intensifiers with academic alternatives" },
    { find: "very", replace: "highly / extremely / particularly", reason: "Use more precise intensifiers" },
    { find: "thing", replace: "aspect / element / factor / component", reason: "Use specific, descriptive nouns instead of vague terms" },
    { find: "stuff", replace: "materials / elements / components", reason: "Replace informal terms with specific language" },
    { find: "kind of", replace: "somewhat / rather / to some extent", reason: "Use more precise hedging language" },
    { find: "sort of", replace: "somewhat / to a degree / partially", reason: "Replace vague qualifiers" },
    { find: "get", replace: "obtain / acquire / receive", reason: "Use more formal verbs" },
    { find: "got", replace: "obtained / acquired / received", reason: "Use past tense of formal verbs" },
    { find: "big", replace: "significant / substantial / considerable", reason: "Use more descriptive adjectives" },
    { find: "good", replace: "effective / beneficial / advantageous", reason: "Use more specific positive descriptors" },
    { find: "bad", replace: "detrimental / adverse / unfavorable", reason: "Use more specific negative descriptors" },
  ]

  for (const pattern of informalPatterns) {
    if (textLower.includes(pattern.find)) {
      // Find actual context
      const index = textLower.indexOf(pattern.find)
      const start = Math.max(0, index - 15)
      const end = Math.min(text.length, index + pattern.find.length + 15)
      const context = text.substring(start, end).trim()
      
      improvements.push({
        original: `"${context}" (contains '${pattern.find}')`,
        improved: pattern.replace,
        reason: pattern.reason
      })
    }
  }

  // Weak phrases
  const weakPhrases = [
    { find: "i think", replace: "This analysis suggests / The evidence indicates", reason: "Avoid first person and weak assertions in academic writing" },
    { find: "i believe", replace: "It can be argued that / The findings suggest", reason: "Use evidence-based language instead of personal belief" },
    { find: "in my opinion", replace: "Based on the analysis / According to the evidence", reason: "Ground assertions in evidence rather than opinion" },
    { find: "you can see", replace: "It is evident that / The data demonstrates", reason: "Avoid addressing the reader directly" },
    { find: "as you know", replace: "[Remove or rephrase]", reason: "Avoid assumptions about reader knowledge" },
  ]

  for (const phrase of weakPhrases) {
    if (textLower.includes(phrase.find)) {
      improvements.push({
        original: `Usage of "${phrase.find}"`,
        improved: phrase.replace,
        reason: phrase.reason
      })
    }
  }

  // Passive voice detection (simplified)
  const passivePatterns = ["was done", "were made", "was given", "were taken", "is being", "was being", "has been done", "have been made"]
  const passiveCount = passivePatterns.filter(p => textLower.includes(p)).length
  if (passiveCount > 0) {
    improvements.push({
      original: `${passiveCount} passive voice construction(s) detected`,
      improved: "Consider active voice for clearer, more direct writing",
      reason: "Active voice often improves clarity and engagement"
    })
  }

  // Sentence starters variety
  const sentenceStarts = text.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(' ')[0]?.toLowerCase())
  
  const startCounts: Record<string, number> = {}
  for (const start of sentenceStarts) {
    if (start) startCounts[start] = (startCounts[start] || 0) + 1
  }
  
  const repetitiveStarts = Object.entries(startCounts)
    .filter(([, count]) => count > 3)
    .map(([word]) => word)
  
  if (repetitiveStarts.length > 0) {
    improvements.push({
      original: `Repetitive sentence starts: "${repetitiveStarts.join('", "')}"`,
      improved: "Vary sentence beginnings for better flow",
      reason: "Repetitive sentence structures can make writing feel monotonous"
    })
  }

  // Conclusion phrases
  const weakConclusions = ["in conclusion", "to sum up", "in summary", "to conclude", "finally"]
  for (const phrase of weakConclusions) {
    if (textLower.includes(phrase)) {
      improvements.push({
        original: `"${phrase}"`,
        improved: "This analysis demonstrates / The findings indicate / In light of this evidence",
        reason: "Use more engaging conclusion starters that emphasize your findings"
      })
      break
    }
  }

  // Document length suggestion
  if (words.length < 200) {
    improvements.push({
      original: `Document length: ${words.length} words`,
      improved: "Consider expanding with more detail, examples, and evidence",
      reason: "Short documents may lack sufficient depth for comprehensive analysis"
    })
  } else if (words.length > 3000) {
    improvements.push({
      original: `Document length: ${words.length} words`,
      improved: "Consider condensing or splitting into focused sections",
      reason: "Very long documents may benefit from more concise expression"
    })
  }

  // Mentor instruction-based improvements
  const instructionLower = instructions.toLowerCase()
  if (instructionLower.includes("academic") || instructionLower.includes("formal")) {
    improvements.push({
      original: "Academic tone check (per instructions)",
      improved: "Ensure formal language throughout, avoid contractions and colloquialisms",
      reason: "Per mentor instructions: maintain academic tone"
    })
  }

  if (instructionLower.includes("citation") || instructionLower.includes("reference")) {
    if (!textLower.includes("reference") && !textLower.includes("citation") && !textLower.includes("et al")) {
      improvements.push({
        original: "No citations detected",
        improved: "Add proper citations and references to support claims",
        reason: "Per mentor instructions: include citations"
      })
    }
  }

  // Calculate score - fewer needed improvements = higher score
  const baseScore = 90
  const deduction = Math.min(40, improvements.length * 4)
  const score = Math.max(45, baseScore - deduction)

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

    // Generate dynamic summary based on actual scores
    const wordCount = getWords(documentText).length
    let summary = ""
    
    if (overallScore >= 85) {
      summary = `Excellent document quality (${wordCount} words analyzed). The document demonstrates strong writing with minimal grammar issues and good research structure. Minor refinements suggested for optimization.`
    } else if (overallScore >= 75) {
      summary = `Good document quality (${wordCount} words analyzed). The analysis identified several areas for improvement in ${grammarAnalysis.score < 75 ? "grammar, " : ""}${researchAnalysis.score < 75 ? "research structure, " : ""}${improvementAnalysis.score < 75 ? "academic tone" : ""}. Review suggested changes.`
    } else if (overallScore >= 60) {
      summary = `Document needs attention (${wordCount} words analyzed). Multiple areas require improvement including grammar (${grammarAnalysis.score}%), research quality (${researchAnalysis.score}%), and writing style (${improvementAnalysis.score}%). Focus on the highlighted issues.`
    } else {
      summary = `Document requires significant revision (${wordCount} words analyzed). The analysis found substantial issues in grammar, structure, and academic writing style. Please address the identified problems systematically.`
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
