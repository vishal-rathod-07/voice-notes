import { MicIcon, FolderIcon, SearchIcon } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon: "mic" | "folder" | "search"
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  const Icon = icon === "mic" ? MicIcon : icon === "folder" ? FolderIcon : SearchIcon

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
      <div className="bg-primary/10 p-4 rounded-full mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-xs">{description}</p>
    </div>
  )
}
