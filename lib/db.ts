"use client"

import { openDB, type DBSchema, type IDBPDatabase } from "idb"

interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  tags: string[]
  createdAt: number
  updatedAt: number
  isSynced: boolean
  folder?: string
  summary?: string
  reminders?: Array<{
    id: string
    text: string
    date: number
    completed: boolean
  }>
}

interface VoiceNotesDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: {
      "by-created": number
      "by-tags": string[]
      "by-folder": string
    }
  }
  folders: {
    key: string
    value: {
      id: string
      name: string
      color: string
      createdAt: number
    }
  }
  settings: {
    key: string
    value: any
  }
}

let dbPromise: Promise<IDBPDatabase<VoiceNotesDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VoiceNotesDB>("voice-notes-db", 1, {
      upgrade(db) {
        // Create notes store
        const notesStore = db.createObjectStore("notes", { keyPath: "id" })
        notesStore.createIndex("by-created", "createdAt")
        notesStore.createIndex("by-tags", "tags", { multiEntry: true })
        notesStore.createIndex("by-folder", "folder")

        // Create folders store
        const foldersStore = db.createObjectStore("folders", { keyPath: "id" })

        // Create settings store
        const settingsStore = db.createObjectStore("settings")

        // Add default folders
        foldersStore.add({
          id: "default",
          name: "All Notes",
          color: "#7c3aed",
          createdAt: Date.now(),
        })

        // Add default settings
        settingsStore.put(
          {
            theme: "system",
            language: "en-US",
            autoSave: true,
            syncEnabled: false,
            wakeLock: true,
          },
          "userSettings",
        )
      },
    })
  }
  return dbPromise
}

export async function getAllNotes(folderId?: string): Promise<Note[]> {
  const db = await getDB()
  if (folderId) {
    return db.getAllFromIndex("notes", "by-folder", folderId)
  }
  return db.getAll("notes")
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  const db = await getDB()
  return db.get("notes", id)
}

export async function saveNote(note: Note): Promise<string> {
  const db = await getDB()
  await db.put("notes", note)
  return note.id
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("notes", id)
}

export async function searchNotes(query: string): Promise<Note[]> {
  const db = await getDB()
  const notes = await db.getAll("notes")

  if (!query) return notes

  const lowerQuery = query.toLowerCase()
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  )
}

export async function getNotesByTag(tag: string): Promise<Note[]> {
  const db = await getDB()
  return db.getAllFromIndex("notes", "by-tags", tag)
}

export async function getAllFolders() {
  const db = await getDB()
  return db.getAll("folders")
}

export async function saveFolder(folder: any) {
  const db = await getDB()
  return db.put("folders", folder)
}

export async function deleteFolder(id: string) {
  const db = await getDB()
  return db.delete("folders", id)
}

export async function getSettings(key = "userSettings") {
  const db = await getDB()
  return db.get("settings", key)
}

export async function saveSettings(settings: any, key = "userSettings") {
  const db = await getDB()
  return db.put("settings", settings, key)
}
