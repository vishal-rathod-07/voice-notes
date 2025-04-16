"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { getTags } from "@/utils/autoTag"

interface TagGeneratorProps {
  text: string
  onTagsGenerated?: (tags: string[]) => void
}

export function TagGenerator({ text, onTagsGenerated }: TagGeneratorProps) {
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!text || text.trim().length === 0) {
      setTags([])
      return
    }

    const generateTags = async () => {
      setLoading(true)
      try {
        const newTags = await getTags(text)
        setTags(newTags)

        if (onTagsGenerated) {
          onTagsGenerated(newTags)
        }
      } catch (error) {
        console.error("Error generating tags:", error)
        setTags([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce the tag generation to avoid excessive processing
    const timer = setTimeout(() => {
      generateTags()
    }, 1000)

    return () => clearTimeout(timer)
  }, [text, onTagsGenerated])

  if (!text || text.trim().length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <div className="text-xs text-muted-foreground mb-1">Suggested tags:</div>
      <div className="flex flex-wrap gap-1">
        {loading ? (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Analyzing...
          </div>
        ) : tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No tags detected yet</span>
        )}
      </div>
    </div>
  )
}
