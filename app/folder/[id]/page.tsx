import { Suspense } from "react"
import { PageLayout } from "@/components/layouts/page-layout"
import { FolderNotes } from "@/components/folders/folder-notes"
import { LoadingNotes } from "@/components/ui/loading-notes"

export default function FolderPage({ params }: { params: { id: string } }) {
  return (
    <PageLayout>
      <div>
        <Suspense fallback={<LoadingNotes />}>
          <FolderNotes id={params.id} />
        </Suspense>
      </div>
    </PageLayout>
  )
}
