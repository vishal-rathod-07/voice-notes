"use client"

import { useState, useEffect } from "react"
import { getSettings, saveSettings } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Loader2Icon, RefreshCwIcon } from "lucide-react"
import { getDB } from "@/lib/db"
import { Input } from "@/components/ui/input"

interface AudioDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hfToken, setHfToken] = useState("")
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
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
            whisperAiTranscription: false,
            huggingFaceToken: "",
            preferredMicrophone: "",
          },
        )

        // Load Hugging Face token if available
        if (userSettings?.huggingFaceToken) {
          setHfToken(userSettings.huggingFaceToken)
          setIsTokenValid(true)
        } else if (typeof window !== "undefined") {
          // Try to get token from localStorage as fallback
          const storedToken = localStorage.getItem("hf_token")
          if (storedToken) {
            setHfToken(storedToken)
            setIsTokenValid(true)
          }
        }

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
    loadAudioDevices()
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

  const loadAudioDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("Media Devices API not supported in this browser")
      return
    }

    setIsLoadingDevices(true)
    try {
      // Request permission to access audio devices
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Get list of audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
          kind: device.kind,
        }))

      setAudioDevices(audioInputs)
    } catch (error) {
      console.error("Error loading audio devices:", error)
    } finally {
      setIsLoadingDevices(false)
    }
  }

  const handleSettingChange = async (key: string, value: any) => {
    if (!settings) return

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

  const handleSaveHuggingFaceToken = async () => {
    if (!settings) return

    setIsCheckingToken(true)

    try {
      // In a real app, we would validate the token here
      // For now, we'll just simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Save token to settings
      const updatedSettings = {
        ...settings,
        huggingFaceToken: hfToken,
      }

      await saveSettings(updatedSettings)
      setSettings(updatedSettings)

      // Also save to localStorage as a backup
      if (typeof window !== "undefined") {
        localStorage.setItem("hf_token", hfToken)
      }

      setIsTokenValid(true)
    } catch (error) {
      console.error("Error saving Hugging Face token:", error)
      setIsTokenValid(false)
    } finally {
      setIsCheckingToken(false)
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
            <div className="flex items-center justify-between">
              <Label htmlFor="microphone">Microphone</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAudioDevices}
                disabled={isLoadingDevices}
                className="h-8 px-2"
              >
                {isLoadingDevices ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="w-4 h-4" />
                )}
                <span className="sr-only">Refresh microphone list</span>
              </Button>
            </div>
            <Select
              value={settings?.preferredMicrophone || ""}
              onValueChange={(value) => handleSettingChange("preferredMicrophone", value)}
              disabled={audioDevices.length === 0}
            >
              <SelectTrigger id="microphone">
                <SelectValue
                  placeholder={audioDevices.length === 0 ? "No microphones detected" : "Select microphone"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Microphone</SelectItem>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {audioDevices.length === 0
                ? "No microphones detected. Please ensure your browser has permission to access audio devices."
                : `${audioDevices.length} microphone(s) available`}
            </p>
          </div>

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
                <p className="text-xs text-muted-foreground">Use Hugging Face Whisper model for transcription</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="whisper-ai"
                  checked={settings?.whisperAiTranscription}
                  onCheckedChange={(checked) => handleSettingChange("whisperAiTranscription", checked)}
                />
              </div>
            </div>
          </div>

          {settings?.whisperAiTranscription && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <Label htmlFor="hf-token">Hugging Face Token</Label>
              <div className="flex space-x-2">
                <Input
                  id="hf-token"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="Enter your Hugging Face token"
                  className="flex-grow"
                />
                <Button onClick={handleSaveHuggingFaceToken} disabled={isCheckingToken || !hfToken} size="sm">
                  {isCheckingToken ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isTokenValid
                  ? "✓ Token saved successfully"
                  : "You need a Hugging Face token to use Whisper AI transcription"}
              </p>
            </div>
          )}
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
