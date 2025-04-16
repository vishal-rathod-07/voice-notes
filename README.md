# **VoiceNotes - Voice-Activated Note-Taking App**  

[![](https://img.shields.io/badge/demo-live-blue)](https://voice-notes-pi.vercel.app/)  
![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)  
![Transformers.js](https://img.shields.io/badge/Transformers.js-2.4+-orange)  

**VoiceNotes** is a **Next.js-powered** progressive web app (PWA) that lets you **capture, transcribe, and organize notes using just your voice**. Perfect for quick memos, meeting notes, or hands-free journaling.  

## **✨ Features**  
✅ **Voice-to-text transcription** (Web Speech API)  
✅ **AI-powered auto-tagging** (Transformers.js)  
✅ **Smart summarization** for long notes  
✅ **Offline-first** (IndexedDB storage)  
✅ **Folder structure** for organizing notes
✅ **PWA support** (installable on mobile/desktop)  

---

## **🚀 Quick Start**  

### **1. Clone the Repository**
```bash
git clone https://github.com/vishal-rathod-07/voice-notes.git
cd voice-notes
```

### **2. Install Dependencies**  
```bash
npm install
# or
yarn install
```

### **3. Run the Development Server**  
```bash
npm run dev
# or
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) to test the app.  

---

## **🛠️ Tech Stack**  
- **Frontend**: Next.js (App Router)  
- **Styling**: Tailwind CSS + Radix UI  
- **Voice Processing**: Web Speech API  
- **AI**: Transformers.js (client-side)  
- **Storage**: IndexedDB (offline-first)  
- **Deployment**: Vercel  

---

## **📂 Project Structure**  
```
voice-notes
├── app
|  ├── folder
|  ├── folders
|  ├── globals.css
|  ├── layout.tsx
|  ├── loading.tsx
|  ├── manifest.ts
|  ├── note
|  ├── page.tsx
|  ├── search
|  ├── service-worker.ts
|  └── settings
├── components
|  ├── folders
|  ├── layouts
|  ├── notes
|  ├── recording
|  ├── search
|  ├── settings
|  ├── theme-provider.tsx
|  ├── theme-toggle.tsx
|  └── ui
├── components.json
├── hooks
|  ├── use-mobile.tsx
|  └── use-toast.ts
├── lib
|  ├── db.ts
|  ├── transformers-service.ts
|  ├── utils.ts
|  └── voice-service.ts
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── public
|  ├── icons
|  ├── placeholder-logo.png
|  ├── placeholder-logo.svg
|  ├── placeholder-user.jpg
|  ├── placeholder.jpg
|  └── placeholder.svg
├── styles
|  └── globals.css
├── tailwind.config.ts
├── tsconfig.json
└── utils
   ├── autoTag.ts
   ├── grammar-correction.ts
   └── summarize.ts
```

---

## **📱 How to Use**  
1. **Record a Note**  
   - Hold the mic button and speak.  
   - Release to auto-transcribe.  

2. **Organize Notes**  
   - Notes are auto-tagged (e.g., "work", "shopping").  
   - Search by keyword or filter by tags.  

3. **Offline Access**  
   - Works without internet (data saved locally).  

---

## **📈 Roadmap**  
- [ ] **Chrome Extension** for quick capture  
- [ ] **Team Collaboration** (share voice notes)  
- [ ] **Audio Editing** (trim recordings)  
- [ ] **Multi-language Support**  

---

## **🤝 Contributing**  
PRs are welcome!  
1. Fork the repo  
2. Create a branch (`git checkout -b feature/your-feature`)  
3. Commit changes (`git commit -m 'Add some feature'`)  
4. Push (`git push origin feature/your-feature`)  
5. Open a PR  

---

**🎙️ Speak now, type never!**  
Deploy your own version or try the live demo (coming soon).  

--- 

**🔗 Links**  
- [Report Issues](https://github.com/vishal-rathod-07/voice-notes/issues)  
- [Next.js Documentation](https://nextjs.org/docs)  
- [Transformers.js Guide](https://huggingface.co/docs/transformers.js/index)  

--- 

**Made with ❤️ and Next.js**