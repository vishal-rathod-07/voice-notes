"use client"

import { useState, useEffect } from "react"
import { searchNotes } from "@/lib/db"
import { NoteCard } from "@/components/notes/note-card"
import { EmptyState } from "@/components/ui/empty-state"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
}

export function SearchResults({ query }: { query: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true)
      try {
        const results = await searchNotes(query)
        setNotes(results)
      } catch (error) {
        console.error("Error searching notes:", error)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [query])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description={`No notes match "${query}". Try a different search term.`}
        icon="search"
      />
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
