import { Suspense } from "react"
import { PageLayout } from "@/components/layouts/page-layout"
import { SearchResults } from "@/components/search/search-results"
import { LoadingNotes } from "@/components/ui/loading-notes"

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q: string }
}) {
  const query = searchParams.q || ""

  return (
    <PageLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Search Results: {query}</h1>
        <Suspense fallback={<LoadingNotes />}>
          <SearchResults query={query} />
        </Suspense>
      </div>
    </PageLayout>
  )
}
