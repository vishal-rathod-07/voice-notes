"use client"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { getSettings, saveSettings } from "@/lib/db"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)

    // Save the theme preference to the database
    try {
      const settings = await getSettings()
      if (settings) {
        await saveSettings({
          ...settings,
          theme: newTheme,
        })
      }
    } catch (error) {
      console.error("Error saving theme preference:", error)
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-md">
      <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
