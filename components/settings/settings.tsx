"use client"

import { useState, useEffect } from "react"
import { getSettings, saveSettings } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Loader2Icon, AlertCircleIcon } from "lucide-react"
import { getDB } from "@/lib/db"

export function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getSettings()
        setSettings(
          userSettings || {
            theme: "system",
            language: "en-US",
            autoSave: true,
            syncEnabled: false,
            wakeLock: true,
            transcriptionMode: "web-speech",
            autoPunctuation: true,
            grammarCorrection: true,
          },
        )

        // Apply the theme from settings if it exists
        if (userSettings?.theme) {
          setTheme(userSettings.theme)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [setTheme])

  // Sync theme state with settings when theme changes externally
  useEffect(() => {
    if (settings && theme && theme !== settings.theme) {
      const updatedSettings = {
        ...settings,
        theme,
      }
      setSettings(updatedSettings)
      saveSettings(updatedSettings).catch((error) => {
        console.error("Error saving theme setting:", error)
      })
    }
  }, [theme, settings])

  const handleSettingChange = async (key: string, value: any) => {
    if (!settings) return

    // Don't allow changing transcriptionMode
    if (key === "transcriptionMode") return

    const updatedSettings = {
      ...settings,
      [key]: value,
    }

    setSettings(updatedSettings)

    try {
      await saveSettings(updatedSettings)

      if (key === "theme") {
        console.log("Setting theme to:", value)
        setTheme(value)
      }
    } catch (error) {
      console.error("Error saving settings:", error)
    }
  }

  const handleExportData = async () => {
    try {
      const db = await getDB()
      const notes = await db.getAll("notes")
      const folders = await db.getAll("folders")
      const settings = await db.getAll("settings")

      const exportData = {
        notes,
        folders,
        settings,
        exportDate: new Date().toISOString(),
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileDefaultName = `voicenotes-backup-${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how VoiceNotes looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={settings?.theme || "system"} onValueChange={(value) => handleSettingChange("theme", value)}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Recognition</CardTitle>
          <CardDescription>Configure voice recognition settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Recognition Language</Label>
            <Select
              value={settings?.language || "en-US"}
              onValueChange={(value) => handleSettingChange("language", value)}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-GB">English (UK)</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
                <SelectItem value="de-DE">German</SelectItem>
                <SelectItem value="ja-JP">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-punctuation">Auto-punctuation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically add punctuation and line breaks based on speech pauses
              </p>
            </div>
            <Switch
              id="auto-punctuation"
              checked={settings?.autoPunctuation}
              onCheckedChange={(checked) => handleSettingChange("autoPunctuation", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="grammar-correction">Grammar Correction</Label>
              <p className="text-sm text-muted-foreground">
                Automatically correct common grammar and spelling mistakes
              </p>
            </div>
            <Switch
              id="grammar-correction"
              checked={settings?.grammarCorrection}
              onCheckedChange={(checked) => handleSettingChange("grammarCorrection", checked)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm">Whisper AI Transcription</div>
                <p className="text-xs text-muted-foreground">Currently unavailable in this environment</p>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircleIcon className="w-4 h-4 text-amber-500" />
                <Switch id="transcription-mode" checked={false} disabled={true} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Behavior</CardTitle>
          <CardDescription>Configure how the app behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save">Auto-save notes</Label>
              <p className="text-sm text-muted-foreground">Automatically save notes while recording</p>
            </div>
            <Switch
              id="auto-save"
              checked={settings?.autoSave}
              onCheckedChange={(checked) => handleSettingChange("autoSave", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="wake-lock">Keep screen on while recording</Label>
              <p className="text-sm text-muted-foreground">Prevent screen from turning off during recording</p>
            </div>
            <Switch
              id="wake-lock"
              checked={settings?.wakeLock}
              onCheckedChange={(checked) => handleSettingChange("wakeLock", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your notes data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExportData}>Export All Data</Button>
        </CardContent>
      </Card>
    </div>
  )
}
