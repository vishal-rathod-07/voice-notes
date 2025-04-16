"use client"

import { useState, useEffect } from "react"
import { getAllNotes } from "@/lib/db"
import { NoteCard } from "./note-card"
import { EmptyState } from "../ui/empty-state"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export function NotesList({ folderId }: { folderId?: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const fetchedNotes = await getAllNotes(folderId)
        // Sort by most recent first
        fetchedNotes.sort((a, b) => b.createdAt - a.createdAt)
        setNotes(fetchedNotes)
      } catch (error) {
        console.error("Error loading notes:", error)
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [folderId])

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        description="Tap the microphone button to create your first voice note."
        icon="mic"
      />
    )
  }

  return (
    <div className="space-y-6 mt-4 pb-24 overflow-y-auto max-h-[calc(100vh-13rem)] flex flex-col">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
