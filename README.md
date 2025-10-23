# StorIA

**StorIA** - An **AI-powered story creation and character development tool** for macOS, built with Electron and React. Write novels with intelligent assistance, manage complex characters, visualize story arcs, and export your work in multiple formats.

## ✨ Features

### 📚 **Multi-Project Management**
- Create and manage multiple book projects
- Switch between projects seamlessly
- Each project maintains its own characters, chapters, and metadata

### 📖 **Book Metadata**
- Comprehensive book details (title, author, genre)
- Synopsis and theme management
- Target word count tracking
- Automatic word count statistics

### 👥 **Character Management**
- Three character types: Main, Secondary, and Tertiary
- Quick descriptions and full biographies
- Character age and role tracking
- **AI-powered character generation** with detailed backgrounds
- Auto-save functionality

### 📝 **Chapter Editor**
- Distraction-free writing environment
- Real-time word and character count
- Auto-save every 500ms
- Chapter ordering and organization
- **AI writing assistant** for content generation
- Chapter synopsis and notes

### 📖 **Reader View (NEW!)**
- Kindle-like reading interface
- 4 beautiful themes (Light, Sepia, Dark, Kindle)
- Adjustable font size and typography
- Chapter navigation and progress tracking
- Keyboard shortcuts for easy reading
- Perfect for previewing and proofreading

### 🤖 **AI Integration**
- **Character Generation**: Create compelling characters with AI
- **Writing Assistant**: Generate chapter content based on your story
- **Text Improvement**: Enhance your prose with AI suggestions
- **Plot Suggestions**: Get AI-generated plot ideas
- Support for OpenAI (GPT-4) and Anthropic (Claude)
- Secure local API key storage

### 🌐 **Character Relationships**
- Visual relationship mapping
- Define relationships between characters
- Relationship types and descriptions
- Color-coded character types

### 📊 **Story Arc Visualization**
- Timeline view of all chapters
- Plot point tracking with categories:
  - Setup
  - Conflict
  - Climax
  - Resolution
- Visual story progression
- Chapter statistics and word counts

### 💾 **Export Functionality**
- **PDF**: Professional formatted output
- **Word (.docx)**: Full Microsoft Word compatibility
- **Markdown (.md)**: Plain text with formatting
- **Plain Text (.txt)**: Universal compatibility
- One-click export to any format

### 🎨 **Modern macOS UI**
- Native macOS look and feel
- Dark theme optimized for long writing sessions
- Hidden inset title bar
- Smooth transitions and animations
- Responsive layout

### 💪 **Data Persistence**
- Automatic localStorage backup
- Never lose your work
- Instant sync across sessions

## 🚀 Getting Started

Authorio now supports **cloud-based data storage** so you can access your projects from any device!

### Choose Your Version

**🌩️ Cloud Version (Recommended)**
- Access projects from multiple devices
- Automatic cloud backups
- User authentication
- See [QUICKSTART_CLOUD.md](./QUICKSTART_CLOUD.md) for setup

**💻 Local Version (Original)**
- Data stored locally only
- No server required
- See below for local setup

### Local Installation (Original Version)

Prerequisites:
- Node.js (v18 or higher)
- npm or yarn

```bash
cd storia
npm install
```

### Running the Local App

**Development Mode:**
```bash
npm run build:electron && npm run dev
```

Or use the helper script:
```bash
./dev.sh
```

The app will:
- Start a Vite dev server on port 3000
- Launch Electron with hot-reload enabled
- Open the application automatically

### Cloud Version Setup

- **Quick Start**: See **[QUICKSTART_CLOUD.md](./QUICKSTART_CLOUD.md)** for the 5-minute cloud setup guide!
- **Full Deployment**: See **[CLOUD_SETUP.md](./CLOUD_SETUP.md)** for detailed deployment instructions
- **AWS Deployment**: See **[AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)** for complete AWS setup guide

### Building for Production

```bash
npm run build
npm run package
```

This creates a distributable application in the `out/` directory:
- macOS: `Authorio-1.0.0.dmg`
- Windows: `Authorio Setup 1.0.0.exe`

## 🎯 How to Use

### 1. **Create Your First Book**
- Launch Authorio
- Click on the project switcher (top of sidebar)
- Select "New Project" or the app will create one automatically
- Fill in your book details (title, author, genre, etc.)

### 2. **Add Characters**
- Navigate to "Characters" in the sidebar
- Click the + button next to any character type (Main/Secondary/Tertiary)
- Fill in character details:
  - Name
  - Quick description
  - Full biography
- **Optional**: Use AI to generate a complete character profile

### 3. **Write Chapters**
- Navigate to "Chapters"
- Click "New Chapter"
- Start writing in the distraction-free editor
- Your work auto-saves every 500ms
- **Optional**: Use AI to generate content or get writing suggestions

### 4. **Map Relationships**
- Navigate to "Relationships"
- View how your characters connect
- See all character types organized visually

### 5. **Visualize Your Story**
- Navigate to "Story Arc"
- See your chapters in timeline view
- Track total word count and progress
- View chapter distribution

### 6. **Configure AI (Optional)**
- Click the project switcher
- Select "Settings"
- Choose AI provider (OpenAI or Anthropic)
- Enter your API key
- Select model (e.g., gpt-4-turbo-preview)
- Your API key is stored locally and securely

### 7. **Export Your Book**
- Click the project switcher
- Select "Export"
- Choose your preferred format:
  - PDF for professional presentation
  - Word for further editing
  - Markdown for version control
  - Plain text for universal access

## 🔧 Project Structure

```
authorio/
├── electron/              # Electron main process
│   ├── main.ts           # App entry point
│   └── preload.ts        # Context bridge
├── src/
│   ├── components/       # React components
│   │   ├── Sidebar.tsx
│   │   ├── ProjectSwitcher.tsx
│   │   ├── CharactersList.tsx
│   │   ├── CharacterEditor.tsx
│   │   ├── ChaptersList.tsx
│   │   ├── ChapterEditor.tsx
│   │   ├── BookMetadataEditor.tsx
│   │   ├── RelationshipMap.tsx
│   │   ├── StoryArcView.tsx
│   │   ├── AIAssistant.tsx
│   │   ├── SettingsModal.tsx
│   │   └── ExportModal.tsx
│   ├── services/         # Business logic
│   │   ├── ai.ts        # AI integration
│   │   └── export.ts    # Export functionality
│   ├── App.tsx          # Main app component
│   ├── types.ts         # TypeScript definitions
│   └── main.tsx         # React entry point
├── package.json
└── README.md
```

## 🛠 Technology Stack

- **Electron 28**: Cross-platform desktop framework
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **OpenAI API**: AI character and content generation
- **jsPDF**: PDF export
- **docx**: Word document export
- **Lucide React**: Beautiful icon library

## 🔐 Privacy & Security

### Local Version
- **All data stored locally**: Your work never leaves your computer
- **API keys stored in localStorage**: Encrypted by your browser
- **No telemetry**: We don't track your usage

### Cloud Version
- **End-to-end encryption**: Your data is secure in transit
- **User authentication**: JWT-based secure login
- **Private projects**: Only you can access your projects
- **Secure storage**: MongoDB with authentication
- **AI calls**: Only sent to your chosen provider (OpenAI/Anthropic)
- **No data sharing**: We never share your work with third parties

## 💡 Tips for Best Results

### AI Usage
- Be specific in your AI prompts for better results
- Use the context field to guide character generation
- Generate content in chunks for better quality
- Review and edit AI-generated content

### Writing Workflow
1. Start with book metadata (premise, themes, target length)
2. Create your main characters first
3. Outline chapters before writing
4. Use the story arc view to maintain pacing
5. Export regularly as backups

### Character Development
- Fill in quick descriptions for all characters first
- Develop full biographies for main characters
- Define relationships to maintain consistency
- Use AI to explore character backgrounds

## 🐛 Troubleshooting

**App won't start?**
- Make sure you've run `npm install`
- Try `npm run build:electron` first
- Check that port 3000 is available

**AI not working?**
- Verify your API key in Settings
- Check your internet connection
- Ensure you have API credits with your provider
- Look at the browser console for error messages

**Export issues?**
- Make sure you have chapters written
- Check that the book title is set
- Try a different export format
- Ensure you have disk space

## 🎨 Keyboard Shortcuts

- `Cmd+S`: Save (automatic, but forces immediate save)
- `Cmd+N`: New chapter/character (context-dependent)
- `Cmd+,`: Open settings
- `Cmd+E`: Export

## 📝 Future Enhancements

Potential features for future versions:
- Real-time collaboration
- Cloud sync
- Version control integration
- Advanced plot structure templates
- Character arc tracking
- Scene-by-scene breakdown
- Writing statistics and insights
- Custom themes and fonts
- Mobile companion app

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome!

## 📄 License

MIT License - Feel free to use and modify for your own writing projects.

## 🙏 Acknowledgments

- Built with love for writers by writers
- Powered by cutting-edge AI technology
- Designed for macOS with attention to detail

---

**Happy Writing! 📚✨**

Create your masterpiece with Authorio.
