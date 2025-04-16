"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { getNoteById, deleteNote, saveNote } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  TrashIcon,
  PlayIcon,
  PauseIcon,
  EditIcon,
  CheckIcon,
  TagIcon,
  PlusIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { summarizeText } from "@/utils/summarize"
import { getTags } from "@/utils/autoTag"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
  updatedAt: number
  summary?: string
}

export function NoteDetail({ id }: { id: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedContent, setEditedContent] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(true)
  const [summary, setSummary] = useState<string>("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadNote = async () => {
      try {
        const fetchedNote = await getNoteById(id)
        if (fetchedNote) {
          setNote(fetchedNote)
          setEditedTitle(fetchedNote.title)
          setEditedContent(fetchedNote.content)

          // Generate suggested tags based on content
          generateSuggestedTags(fetchedNote.content)

          // Load or generate summary
          if (fetchedNote.summary) {
            setSummary(fetchedNote.summary)
          } else if (fetchedNote.content && fetchedNote.content.length > 100) {
            generateSummary(fetchedNote.content)
          }
        }
      } catch (error) {
        console.error("Error loading note:", error)
      }
    }

    loadNote()
  }, [id])

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [audio])

  const generateSummary = async (content: string) => {
    if (!content || content.length < 100) {
      setSummary("")
      return
    }

    setIsSummarizing(true)
    try {
      // Generate summary
      const generatedSummary = summarizeText(content)
      setSummary(generatedSummary)

      // Save summary to note if we have a note
      if (note) {
        const updatedNote = {
          ...note,
          summary: generatedSummary,
        }
        await saveNote(updatedNote)
        setNote(updatedNote)
      }
    } catch (error) {
      console.error("Error generating summary:", error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const generateSuggestedTags = async (content: string) => {
    if (!content || content.trim().length === 0) {
      setSuggestedTags([])
      return
    }

    setIsGeneratingTags(true)
    try {
      // Use our enhanced auto-tagging
      const generatedTags = await getTags(content)

      // Filter out tags that already exist in the note
      const existingTags = note?.tags || []
      const filteredTags = generatedTags.filter((tag) => !existingTags.includes(tag))

      setSuggestedTags(filteredTags)
    } catch (error) {
      console.error("Error generating suggested tags:", error)
      setSuggestedTags([])
    } finally {
      setIsGeneratingTags(false)
    }
  }

  const toggleAudio = () => {
    if (!note?.audioUrl) return

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

  const handleDelete = async () => {
    try {
      await deleteNote(id)
      router.push("/")
    } catch (error) {
      console.error("Error deleting note:", error)
    }
  }

  const handleSaveEdit = async () => {
    if (!note) return

    try {
      const updatedNote = {
        ...note,
        title: editedTitle,
        content: editedContent,
        updatedAt: Date.now(),
      }

      // If content changed significantly, regenerate summary
      if (Math.abs(updatedNote.content.length - note.content.length) > 50) {
        updatedNote.summary = summarizeText(updatedNote.content)
      }

      await saveNote(updatedNote)
      setNote(updatedNote)
      setIsEditing(false)

      // Regenerate suggested tags based on new content
      generateSuggestedTags(editedContent)

      // Update summary if content changed
      if (updatedNote.summary) {
        setSummary(updatedNote.summary)
      }
    } catch (error) {
      console.error("Error saving note:", error)
    }
  }

  const handleAddTag = async () => {
    if (!note || !newTag.trim()) return

    try {
      // Don't add duplicate tags
      if (note.tags.includes(newTag.trim().toLowerCase())) {
        setNewTag("")
        setTagDialogOpen(false)
        return
      }

      const updatedNote = {
        ...note,
        tags: [...note.tags, newTag.trim().toLowerCase()],
        updatedAt: Date.now(),
      }

      await saveNote(updatedNote)
      setNote(updatedNote)
      setNewTag("")
      setTagDialogOpen(false)

      // Update suggested tags
      generateSuggestedTags(note.content)
    } catch (error) {
      console.error("Error adding tag:", error)
    }
  }

  const handleAddSuggestedTag = async (tag: string) => {
    if (!note) return

    try {
      // Don't add duplicate tags
      if (note.tags.includes(tag)) {
        return
      }

      const updatedNote = {
        ...note,
        tags: [...note.tags, tag],
        updatedAt: Date.now(),
      }

      await saveNote(updatedNote)
      setNote(updatedNote)

      // Remove from suggested tags
      setSuggestedTags(suggestedTags.filter((t) => t !== tag))
    } catch (error) {
      console.error("Error adding suggested tag:", error)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!note) return

    try {
      const updatedNote = {
        ...note,
        tags: note.tags.filter((tag) => tag !== tagToRemove),
        updatedAt: Date.now(),
      }

      await saveNote(updatedNote)
      setNote(updatedNote)
    } catch (error) {
      console.error("Error removing tag:", error)
    }
  }

  const toggleSummary = () => {
    setShowSummary(!showSummary)
  }

  const handleRegenerateTags = async () => {
    if (!note) return

    setIsGeneratingTags(true)
    try {
      const generatedTags = await getTags(note.content)
      setSuggestedTags(generatedTags.filter((tag) => !note.tags.includes(tag)))
    } catch (error) {
      console.error("Error regenerating tags:", error)
    } finally {
      setIsGeneratingTags(false)
    }
  }

  if (!note) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p>Note not found</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <div className="flex space-x-2">
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <EditIcon className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}

          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <TrashIcon className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="text-xl font-bold" />
          </div>

          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[200px]"
          />

          <div className="flex justify-end">
            <Button onClick={handleSaveEdit}>
              <CheckIcon className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">{note.title}</h1>

          <div className="text-sm text-muted-foreground mb-4">
            {formatDistanceToNow(note.createdAt, { addSuffix: true })}
            {note.createdAt !== note.updatedAt && " (edited)"}
          </div>

          {/* Summary section */}
          {(summary || isSummarizing) && (
            <div className="mb-6 bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Summary</h3>
                <Button variant="ghost" size="sm" onClick={toggleSummary} className="h-6 p-0 w-6">
                  {showSummary ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </Button>
              </div>

              {showSummary && (
                <div className="text-sm text-muted-foreground">
                  {isSummarizing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                      <span>Generating summary...</span>
                    </div>
                  ) : (
                    summary
                  )}
                </div>
              )}
            </div>
          )}

          {note.audioUrl && (
            <div className="mb-6">
              <Button variant="outline" size="sm" onClick={toggleAudio} className="flex items-center">
                {isPlaying ? (
                  <>
                    <PauseIcon className="w-4 h-4 mr-2" />
                    Pause Audio
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Play Audio
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="whitespace-pre-wrap">{note.content}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-6">
            <TagIcon className="w-4 h-4 text-muted-foreground" />

            {note.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag}
                <XIcon className="w-3 h-3" />
              </Badge>
            ))}

            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setTagDialogOpen(true)}>
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Suggested tags section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Suggested tags:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateTags}
                disabled={isGeneratingTags}
                className="h-6 text-xs"
              >
                {isGeneratingTags ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Regenerate"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {isGeneratingTags ? (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing content...
                </div>
              ) : suggestedTags.length > 0 ? (
                suggestedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleAddSuggestedTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No additional tags suggested</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Enter a new tag for this note.</DialogDescription>
          </DialogHeader>
          <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Enter tag name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTag}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
