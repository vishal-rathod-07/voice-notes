import { Suspense } from "react"
import { PageLayout } from "@/components/layouts/page-layout"
import { NoteDetail } from "@/components/notes/note-detail"
import { LoadingNote } from "@/components/ui/loading-note"

export default function NotePage({ params }: { params: { id: string } }) {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<LoadingNote />}>
          <NoteDetail id={params.id} />
        </Suspense>
      </div>
    </PageLayout>
  )
}
