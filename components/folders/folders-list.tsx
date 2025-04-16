"use client"

import { useState, useEffect } from "react"
import { getAllFolders, saveFolder, deleteFolder } from "@/lib/db"
import { FolderCard } from "./folder-card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { v4 as uuidv4 } from "uuid"

interface Folder {
  id: string
  name: string
  color: string
  createdAt: number
}

export function FoldersList() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderColor, setNewFolderColor] = useState("#7c3aed")

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const fetchedFolders = await getAllFolders()
        setFolders(fetchedFolders)
      } catch (error) {
        console.error("Error loading folders:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFolders()
  }, [])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const newFolder = {
        id: uuidv4(),
        name: newFolderName.trim(),
        color: newFolderColor,
        createdAt: Date.now(),
      }

      await saveFolder(newFolder)
      setFolders([...folders, newFolder])
      setNewFolderName("")
      setNewFolderColor("#7c3aed")
      setDialogOpen(false)
    } catch (error) {
      console.error("Error creating folder:", error)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id)
      setFolders(folders.filter((folder) => folder.id !== id))
    } catch (error) {
      console.error("Error deleting folder:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {folders.length === 0 ? (
        <EmptyState title="No folders yet" description="Create folders to organize your notes." icon="folder" />
      ) : (
        <div className="space-y-6 pb-24">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onDelete={handleDeleteFolder} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for your new folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="folder-name" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
              />
            </div>
            <div>
              <label htmlFor="folder-color" className="text-sm font-medium">
                Folder Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="folder-color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <span className="text-sm">{newFolderColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
