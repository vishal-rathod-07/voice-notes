"use client"

import { useState, useEffect } from "react"
import { getAllNotes, getNotesByTag } from "@/lib/db"
import { NoteCard } from "@/components/notes/note-card"
import { EmptyState } from "@/components/ui/empty-state"
import { useRouter } from "next/navigation"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
}

export function FolderNotes({ id }: { id: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [folderName, setFolderName] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadNotes = async () => {
      try {
        let fetchedNotes: Note[] = []

        // If it's a tag (starts with #)
        if (id.startsWith("#")) {
          const tag = id.substring(1)
          fetchedNotes = await getNotesByTag(tag)
          setFolderName(`#${tag}`)
        } else {
          fetchedNotes = await getAllNotes(id)
          // In a real app, we would fetch the folder name from the database
          setFolderName("Folder")
        }

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
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{folderName}</h1>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="No notes in this folder"
          description="Record a new note or move existing notes here."
          icon="folder"
        />
      ) : (
        <div className="space-y-6 pb-24">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
