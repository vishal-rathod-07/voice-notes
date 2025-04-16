"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MicIcon, FolderIcon, SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

export function PageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isInstallable, setIsInstallable] = React.useState(false)
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null)

  React.useEffect(() => {
    // PWA install detection
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {})
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center space-x-2">
            <MicIcon className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">VoiceNotes</span>
          </Link>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md"
              >
                Install App
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto container px-4 py-4">{children}</main>

      <nav className="border-t bg-background">
        <div className="container flex items-center justify-around h-16">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full",
              pathname === "/" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MicIcon className="w-6 h-6" />
            <span className="text-xs">Notes</span>
          </Link>
          <Link
            href="/folders"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full",
              pathname === "/folders" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <FolderIcon className="w-6 h-6" />
            <span className="text-xs">Folders</span>
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full",
              pathname === "/settings" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
