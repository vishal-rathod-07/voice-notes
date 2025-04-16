import { Suspense } from "react"
import { PageLayout } from "@/components/layouts/page-layout"
import { NotesList } from "@/components/notes/notes-list"
import { RecordButton } from "@/components/recording/record-button"
import { SearchBar } from "@/components/search/search-bar"
import { LoadingNotes } from "@/components/ui/loading-notes"

export default function Home() {
  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        <SearchBar />
        <Suspense fallback={<LoadingNotes />}>
          <NotesList />
        </Suspense>
        <RecordButton />
      </div>
    </PageLayout>
  )
}
