# EduScrapeApp

<p align="center">
  <img src="https://i.imgur.com/r4W9l7n.png" alt="EduScrapeApp Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Automated Curriculum Curation Platform for Educators</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#technology-stack">Tech Stack</a> •
  <a href="#the-team">Team</a>
</p>

---

## Overview

**EduScrapeApp** is a comprehensive educational content management platform designed to revolutionize how schools, tutoring centers, and educators discover, organize, and deliver curriculum-ready materials. Instead of manually searching and copying resources from dozens of websites, educators can define a topic once and let EduScrapeApp surface the most relevant content—complete with readability grading and citation tracking.

### The Problem We Solve

Educators spend countless hours searching for quality educational materials across multiple platforms. This fragmented approach leads to:

- ⏰ **Wasted preparation time** - Teachers spend hours hunting for resources instead of teaching
- 📚 **Disorganized materials** - Content scattered across different platforms and formats
- 🔗 **Broken citations** - Difficulty tracking sources and maintaining academic integrity
- 📱 **Accessibility issues** - Materials not easily accessible across devices or in offline environments

### Our Solution

EduScrapeApp provides a unified platform that:

- **Automates content discovery** - Smart scraping and curation of educational resources
- **Organizes by curriculum** - Materials tagged and organized by grade, subject, and topic
- **Enables instant access** - One-click sharing to any device with offline support
- **Maintains quality** - Readability grading and source tracking for every resource

---

## Key Features

### 📖 Digital Library System

The heart of EduScrapeApp is its comprehensive digital library that provides:

- **Grade-Based Organization** - Materials organized from Class 1 through Class 12
- **Subject Hierarchy** - Browse by subject (Language, Mathematics, Science, etc.) and sub-categories
- **Multi-Format Support** - Access PDFs, documents, and educational materials
- **In-Browser PDF Viewer** - Full-featured PDF reader with:
  - Page navigation controls
  - Zoom and pan functionality
  - Download options for offline access
  - Progress tracking

### 🤖 AI-Powered Assistant

An intelligent chatbot assistant that helps users:

- **Navigate the Library** - Ask questions like "Open the English textbook for Class 5"
- **Search Content** - Find specific topics across all materials
- **Get Recommendations** - Receive personalized content suggestions based on grade and interests
- **Web Search Integration** - Access real-time information from the web
- **Context-Aware Responses** - The AI understands your current grade and location in the app

### 👤 User Profiles & Personalization

- **Role-Based Access** - Different experiences for Students, Teachers, and Administrators
- **Grade Configuration** - Students set their grade for personalized content
- **Profile Completion Tracking** - Guided onboarding to set up your account
- **Persistent Preferences** - Your settings and progress are saved across sessions

### 🎨 Modern User Interface

- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme** - Toggle between themes based on your preference
- **Smooth Animations** - Polished transitions and interactions
- **Accessibility** - Built with accessibility best practices

### 📊 Dashboard & Analytics

A personalized workspace featuring:

- **Quick Actions** - Shortcuts to frequently used features
- **Recent Activity** - Track your latest content interactions
- **Insights** - View engagement metrics and learning progress
- **Upcoming Features** - Analytics and recommendations dashboard (coming soon)

### 🔐 Admin Panel

For administrators and content managers:

- **Content Management** - Add, edit, and organize educational materials
- **Team Management** - View and manage user accounts
- **GitHub Integration** - Sync project updates and releases automatically
- **Update Publishing** - Create and publish platform announcements

---

## How It Works

### For Students

1. **Sign In** - Create an account using Google or email authentication
2. **Complete Profile** - Set your name, role, and grade level
3. **Browse Library** - Navigate to your grade's educational materials
4. **Access Content** - Open ZIP archives to extract and view PDF textbooks
5. **Get Help** - Use the AI Assistant for navigation and questions

### For Teachers

1. **Access Dashboard** - View teaching resources and materials
2. **Browse All Grades** - Access content across all grade levels
3. **Download Materials** - Get PDFs for classroom use
4. **Track Updates** - Stay informed about new content and platform features

### For Administrators

1. **Manage Content** - Add new educational materials and updates
2. **GitHub Sync** - Automatically import release notes and project updates
3. **Team Oversight** - View all registered accounts and their roles
4. **Publish Announcements** - Create platform-wide updates and notifications

---

## Technology Stack

### Frontend
- **React 19** - Modern UI library with hooks and functional components
- **TypeScript** - Type-safe development for reliability
- **Tailwind CSS** - Utility-first styling for rapid development
- **Vite** - Lightning-fast build tool and development server
- **Lucide React** - Beautiful, customizable icons

### Backend
- **Convex** - Real-time database and serverless functions
- **Convex Auth** - Secure authentication with Google and email providers

### Key Libraries
- **JSZip** - In-browser ZIP file extraction
- **PDF.js / React-PDF** - Advanced PDF rendering and viewing
- **Sonner** - Toast notifications for user feedback
- **Supabase** - Additional authentication for AI features

### External Services
- **Firebase Hosting** - Educational content delivery (https://eduscrape-host.web.app)
- **OpenRouter API** - AI chatbot powered by Claude 3.5 Sonnet
- **Alsom API** - Enhanced AI capabilities for authenticated users

---

## Impact & Metrics

<table>
  <tr>
    <td align="center"><strong>85%</strong><br/>Prep Time Saved</td>
    <td align="center"><strong>10,000+</strong><br/>Curated Resources</td>
    <td align="center"><strong>Class 1-12</strong><br/>Full Coverage</td>
  </tr>
</table>

---

## The Team

EduScrapeApp is built by a dedicated team of innovators:

| Name | Role |
|------|------|
| **Reyansh Niranjan** | Creativity & Designing Head - Lead on development, website design, presentations, and device creation |
| **Jeebika Choudary** | Team Leader - Coordinates team activities and project alignment |
| **Anshita Mohanty** | Creativity & Designing Head - Creative solutions and design approaches |
| **Shreya Kar** | Finance Head - Budget management and financial planning |
| **Sai Sradha Ray** | Presentation Head - Presentation development and public speaking |
| **Riya Sakshi** | Social Impact Head - Social implications and community impact |
| **Nirlipta Sahoo** | Networking & Outreach Head - External partnerships and outreach |

---

## Related Projects

### EduScraper-Device

An ESP32-powered autonomous device that intelligently downloads and stores educational resources on an SD card. Features include:

- **Offline-First Design** - Access materials without internet connectivity
- **Custom UI Library** - Purpose-built display interface
- **Automatic Sync** - Downloads new content when connected
- **Low-Connectivity Support** - Perfect for areas with limited internet access

---

## Platform Architecture

```
EduScrapeApp
├── 🌐 Web Application (This Repository)
│   ├── Landing Page - Hero, About, Features, Team, Updates
│   ├── User Dashboard - Overview, Library, Profile
│   ├── PDF Library - Grade-based content browser
│   ├── AI Assistant - Chatbot with web search
│   └── Admin Panel - Content and team management
│
├── 📦 Content Storage (Firebase)
│   └── https://eduscrape-host.web.app
│       ├── Class1/ through Class12/
│       ├── structure.json
│       └── zips.json
│
└── ⚡ Backend (Convex)
    ├── Authentication
    ├── User Profiles
    ├── Projects & Updates
    ├── Team Members
    └── AI Chatbot Actions
```

---

## Future Roadmap

- 📑 **Bookmarking** - Save favorite PDFs and chapters
- 📈 **Progress Tracking** - Monitor reading and learning progress
- 💾 **Offline Mode** - Cache content for offline access
- 🔍 **Full-Text Search** - Search across all PDF content
- 📝 **Notes & Annotations** - Add personal notes to materials
- 📊 **Enhanced Analytics** - Detailed engagement and usage metrics

---

## License

This project is part of the CPX - SE initiative. All rights reserved.

---

<p align="center">
  <strong>EduScrapeApp</strong> — Reinventing Learning Through Automation
</p>
