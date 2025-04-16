/**
 * Simple extractive text summarization utility
 * This is a lightweight alternative to transformer-based summarization
 * that works reliably in browser environments
 */

// Split text into sentences
function splitIntoSentences(text: string): string[] {
  // Basic sentence splitting - handles periods, question marks, and exclamation points
  // followed by spaces or end of string
  const sentenceEndings = /[.!?](\s|$)/
  const sentences = text.split(sentenceEndings).filter(Boolean)

  // Recombine sentences with their endings
  const result: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    if (i + 1 < sentences.length) {
      result.push(sentences[i] + sentences[i + 1])
    } else {
      result.push(sentences[i])
    }
  }

  return result.filter((s) => s.trim().length > 10) // Filter out very short sentences
}

// Calculate word frequency in the text
function calculateWordFrequency(text: string): Record<string, number> {
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "about",
    "as",
    "of",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "i",
    "my",
    "me",
    "you",
    "your",
    "we",
    "our",
    "they",
    "their",
    "he",
    "his",
    "she",
    "her",
  ])

  const wordFreq: Record<string, number> = {}

  for (const word of words) {
    if (!stopWords.has(word) && word.length > 1) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  }

  return wordFreq
}

// Score sentences based on word frequency
function scoreSentences(sentences: string[], wordFreq: Record<string, number>): number[] {
  return sentences.map((sentence) => {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || []
    let score = 0

    for (const word of words) {
      if (wordFreq[word]) {
        score += wordFreq[word]
      }
    }

    // Normalize by sentence length to avoid bias towards longer sentences
    return score / Math.max(1, words.length)
  })
}

// Get top N sentences as summary
function getTopSentences(sentences: string[], scores: number[], n: number): string[] {
  // Create array of [index, score] pairs
  const indexedScores = scores.map((score, index) => [index, score])

  // Sort by score in descending order
  indexedScores.sort((a, b) => b[1] - a[1])

  // Get indices of top N sentences
  const topIndices = indexedScores.slice(0, n).map((pair) => pair[0])

  // Sort indices to maintain original order
  topIndices.sort()

  // Return top sentences in original order
  return topIndices.map((index) => sentences[index])
}

export function summarizeText(text: string, maxSentences = 3): string {
  if (!text || text.length < 100) {
    return text // Return original text if it's too short
  }

  const sentences = splitIntoSentences(text)

  // If there are fewer sentences than maxSentences, return the original text
  if (sentences.length <= maxSentences) {
    return text
  }

  const wordFreq = calculateWordFrequency(text)
  const scores = scoreSentences(sentences, wordFreq)
  const topSentences = getTopSentences(sentences, scores, maxSentences)

  return topSentences.join(" ")
}
