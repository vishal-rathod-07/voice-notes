import { Suspense } from "react"
import dynamic from "next/dynamic"
import { PageLayout } from "@/components/layouts/page-layout"
import { NotesList } from "@/components/notes/notes-list"
import { SearchBar } from "@/components/search/search-bar"
import { LoadingNotes } from "@/components/ui/loading-notes"

const RecordButton = dynamic(
  () => import("@/components/recording/record-button").then(mod => ({ default: mod.RecordButton })),
  { ssr: false }
)

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