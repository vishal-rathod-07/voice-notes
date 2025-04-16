import nlp from "compromise"

// Define common categories and their related keywords
const CATEGORIES = {
  work: [
    "meeting",
    "project",
    "deadline",
    "client",
    "presentation",
    "report",
    "email",
    "task",
    "work",
    "job",
    "office",
    "business",
    "colleague",
    "manager",
    "team",
    "boss",
  ],
  shopping: [
    "buy",
    "purchase",
    "shopping",
    "store",
    "grocery",
    "groceries",
    "list",
    "item",
    "items",
    "shop",
    "mall",
    "market",
    "price",
    "discount",
    "sale",
  ],
  health: [
    "doctor",
    "appointment",
    "medicine",
    "exercise",
    "workout",
    "fitness",
    "diet",
    "nutrition",
    "health",
    "medical",
    "hospital",
    "symptom",
    "pain",
    "therapy",
  ],
  travel: [
    "trip",
    "travel",
    "vacation",
    "flight",
    "hotel",
    "booking",
    "reservation",
    "journey",
    "destination",
    "tourist",
    "passport",
    "visa",
    "airport",
  ],
  education: [
    "study",
    "learn",
    "course",
    "class",
    "school",
    "university",
    "college",
    "education",
    "homework",
    "assignment",
    "exam",
    "test",
    "lecture",
    "professor",
    "student",
  ],
  finance: [
    "money",
    "budget",
    "expense",
    "payment",
    "bill",
    "invoice",
    "cost",
    "price",
    "financial",
    "bank",
    "credit",
    "debit",
    "loan",
    "invest",
    "tax",
  ],
  personal: [
    "family",
    "friend",
    "home",
    "personal",
    "private",
    "life",
    "relationship",
    "birthday",
    "anniversary",
    "celebration",
  ],
  idea: ["idea", "concept", "thought", "thinking", "brainstorm", "creative", "innovation", "plan", "strategy"],
  todo: ["todo", "to-do", "task", "complete", "finish", "done", "checklist", "pending", "reminder", "schedule"],
  technology: [
    "computer",
    "software",
    "hardware",
    "app",
    "application",
    "website",
    "internet",
    "tech",
    "technology",
    "digital",
    "device",
    "mobile",
    "phone",
  ],
}

// Define common action verbs that might indicate a task or todo
const ACTION_VERBS = [
  "call",
  "email",
  "write",
  "send",
  "buy",
  "purchase",
  "make",
  "create",
  "finish",
  "complete",
  "schedule",
  "plan",
  "organize",
  "arrange",
  "prepare",
  "review",
  "check",
  "update",
  "contact",
]

/**
 * Advanced auto-tagging function that uses Compromise.js to extract
 * meaningful tags from text content
 */
export async function getTags(text: string, maxTags = 5): Promise<string[]> {
  if (!text || text.trim().length < 10) {
    return []
  }

  try {
    const doc = nlp(text)
    const tags = new Set<string>()

    // 1. Category detection based on keywords
    Object.entries(CATEGORIES).forEach(([category, keywords]) => {
      const found = keywords.some((keyword) => {
        // Check for the keyword as a whole word
        return doc.has(keyword) || new RegExp(`\\b${keyword}\\b`, "i").test(text.toLowerCase())
      })

      if (found) {
        tags.add(category)
      }
    })

    // 2. Extract named entities
    // People
    const people = doc.people().out("array")
    people.forEach((person) => {
      if (person && person.length > 2) {
        tags.add(person.toLowerCase())
      }
    })

    // Organizations
    const organizations = doc.organizations().out("array")
    organizations.forEach((org) => {
      if (org && org.length > 2) {
        tags.add(org.toLowerCase())
      }
    })

    // Places
    const places = doc.places().out("array")
    places.forEach((place) => {
      if (place && place.length > 2) {
        tags.add(place.toLowerCase())
      }
    })

    // 3. Extract important nouns as potential topics
    const nouns = doc.nouns().out("array")
    nouns.forEach((noun) => {
      if (noun && noun.length > 3 && !noun.includes(" ")) {
        // Only add single-word nouns that are at least 4 characters
        tags.add(noun.toLowerCase())
      }
    })

    // 4. Detect action items and todos
    const hasActionVerb = ACTION_VERBS.some((verb) => doc.has(verb))
    const hasTimeReference = doc.has("#Date") || doc.has("#Time") || doc.has("tomorrow") || doc.has("today")

    if (hasActionVerb) {
      tags.add("action")
    }

    if (hasTimeReference) {
      tags.add("schedule")
    }

    if (hasActionVerb && hasTimeReference) {
      tags.add("todo")
    }

    // 5. Check for questions
    if (doc.questions().length > 0) {
      tags.add("question")
    }

    // 6. Extract hashtags if present
    const hashtagRegex = /#(\w+)/g
    const hashtags = text.match(hashtagRegex)
    if (hashtags) {
      hashtags.forEach((tag) => {
        tags.add(tag.substring(1).toLowerCase())
      })
    }

    // 7. Detect urgency
    if (
      doc.has("urgent") ||
      doc.has("immediately") ||
      doc.has("asap") ||
      doc.has("emergency") ||
      doc.has("right away")
    ) {
      tags.add("urgent")
    }

    // 8. Basic sentiment analysis
    // Count positive and negative words
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "awesome",
      "happy",
      "love",
      "like",
      "best",
    ]
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "horrible",
      "poor",
      "worst",
      "hate",
      "dislike",
      "disappointed",
      "disappointing",
      "sad",
      "angry",
    ]

    let positiveCount = 0
    let negativeCount = 0

    positiveWords.forEach((word) => {
      if (doc.has(word)) {
        positiveCount++
      }
    })

    negativeWords.forEach((word) => {
      if (doc.has(word)) {
        negativeCount++
      }
    })

    if (positiveCount > negativeCount && positiveCount > 1) {
      tags.add("positive")
    } else if (negativeCount > positiveCount && negativeCount > 1) {
      tags.add("negative")
    }

    // Limit to a reasonable number of tags
    return Array.from(tags).slice(0, maxTags)
  } catch (error) {
    console.error("Error in auto-tagging:", error)
    return []
  }
}
