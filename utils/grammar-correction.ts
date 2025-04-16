/**
 * Basic rule-based grammar correction utility
 * This provides lightweight grammar correction without requiring external APIs
 */

// Common grammar mistakes and their corrections
const GRAMMAR_RULES: [RegExp, string][] = [
  // Capitalization at the beginning of sentences
  [/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => punctuation + letter.toUpperCase()],

  // Double spaces
  [/\s{2,}/g, " "],

  // Common contractions
  [/\b(can not)\b/g, "cannot"],
  [/\b(will not)\b/g, "won't"],
  [/\b(shall not)\b/g, "shan't"],
  [/\b(is not)\b/g, "isn't"],
  [/\b(are not)\b/g, "aren't"],
  [/\b(do not)\b/g, "don't"],
  [/\b(does not)\b/g, "doesn't"],
  [/\b(did not)\b/g, "didn't"],
  [/\b(has not)\b/g, "hasn't"],
  [/\b(have not)\b/g, "haven't"],
  [/\b(had not)\b/g, "hadn't"],
  [/\b(could not)\b/g, "couldn't"],
  [/\b(would not)\b/g, "wouldn't"],
  [/\b(should not)\b/g, "shouldn't"],

  // Common spelling mistakes
  [/\b(alot)\b/g, "a lot"],
  [/\b(seperate)\b/g, "separate"],
  [/\b(definately)\b/g, "definitely"],
  [/\b(recieve)\b/g, "receive"],
  [/\b(untill)\b/g, "until"],
  [/\b(occured)\b/g, "occurred"],
  [/\b(tommorrow)\b/g, "tomorrow"],
  [/\b(accomodate)\b/g, "accommodate"],

  // Subject-verb agreement
  [/\b(they is)\b/g, "they are"],
  [/\b(there is .* and .*)\b/g, "there are"],
  [/\b(we is)\b/g, "we are"],
  [/\b(you is)\b/g, "you are"],
  [/\b(he are)\b/g, "he is"],
  [/\b(she are)\b/g, "she is"],
  [/\b(it are)\b/g, "it is"],

  // Article usage
  [/\b(a [aeiou])/gi, (match) => "an " + match.substring(2)],

  // Repeated words
  [/\b(\w+)(\s+\1\b)+/gi, "$1"],

  // Missing spaces after punctuation
  [/([.!?,;:])([A-Za-z])/g, "$1 $2"],

  // Ensure proper spacing around punctuation
  [/\s+([.!?,;:])/g, "$1"],
]

/**
 * Apply basic grammar correction to text
 * @param text The text to correct
 * @returns Corrected text
 */
export function correctGrammar(text: string): string {
  if (!text) return text

  let correctedText = text

  // Apply all grammar rules
  GRAMMAR_RULES.forEach(([pattern, replacement]) => {
    correctedText = correctedText.replace(pattern, replacement as string)
  })

  // Ensure the first letter of the text is capitalized
  if (correctedText.length > 0 && /[a-z]/.test(correctedText[0])) {
    correctedText = correctedText[0].toUpperCase() + correctedText.slice(1)
  }

  return correctedText
}

/**
 * Apply grammar correction to a transcript with line breaks
 * Preserves the line break structure
 */
export function correctTranscriptGrammar(transcript: string): string {
  if (!transcript) return transcript

  // Split by line breaks, correct each line, then rejoin
  const lines = transcript.split("\n")
  const correctedLines = lines.map((line) => correctGrammar(line))

  return correctedLines.join("\n")
}
