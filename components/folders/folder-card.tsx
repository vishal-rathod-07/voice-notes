"use client"

import Link from "next/link"
import { FolderIcon, TrashIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Folder {
  id: string
  name: string
  color: string
  createdAt: number
}

interface FolderCardProps {
  folder: Folder
  onDelete: (id: string) => void
}

export function FolderCard({ folder, onDelete }: FolderCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = () => {
    onDelete(folder.id)
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <Link href={`/folder/${folder.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: folder.color + "20" }}
              >
                <FolderIcon className="w-5 h-5" style={{ color: folder.color }} />
              </div>
              <div>
                <h3 className="font-medium">{folder.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {/* We would fetch the count of notes in this folder */}0 notes
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDeleteDialogOpen(true)
              }}
            >
              <TrashIcon className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      </Link>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the folder "{folder.name}"? This won't delete the notes inside.
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
    </>
  )
}
