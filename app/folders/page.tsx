import { Suspense } from "react"
import { PageLayout } from "@/components/layouts/page-layout"
import { FoldersList } from "@/components/folders/folders-list"
import { LoadingFolders } from "@/components/ui/loading-folders"

export default function FoldersPage() {
  return (
    <PageLayout>
      <div>
        <h1 className="text-2xl font-bold mb-6">Folders</h1>
        <Suspense fallback={<LoadingFolders />}>
          <FoldersList />
        </Suspense>
      </div>
    </PageLayout>
  )
}
