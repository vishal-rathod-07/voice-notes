import { PageLayout } from "@/components/layouts/page-layout"
import { Settings } from "@/components/settings/settings"

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <Settings />
      </div>
    </PageLayout>
  )
}
