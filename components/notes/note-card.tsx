"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayIcon, PauseIcon } from "lucide-react"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
  summary?: string
}

export function NoteCard({ note }: { note: Note }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const toggleAudio = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!note.audioUrl) return

    if (!audio) {
      const newAudio = new Audio(note.audioUrl)
      newAudio.addEventListener("ended", () => setIsPlaying(false))
      setAudio(newAudio)
      newAudio.play()
      setIsPlaying(true)
    } else {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Display summary if available, otherwise show content
  const displayText = note.summary || note.content

  return (
    <Link href={`/note/${note.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-lg line-clamp-1">{note.title}</h3>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(note.createdAt, { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{displayText}</p>

          <div className="flex justify-between items-center mt-3">
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {note.audioUrl && (
              <button
                onClick={toggleAudio}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
