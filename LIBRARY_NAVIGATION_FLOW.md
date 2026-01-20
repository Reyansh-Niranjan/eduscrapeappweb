# PDF Library Navigation Flow Documentation

## Overview
The EduScrapeApp PDF Library provides a complete hierarchical navigation system that allows students to browse and access educational materials based on their grade level. The system is built on Firebase hosting and uses a structured approach to organize content. The landing page now highlights AI-ready search, prep time savings, and secure citation tracking before users enter the library.

## Architecture

### Base URL
- **Public Site**: `https://eduscrape-host.web.app/`
- **Purpose**: Serves as the root for all resource paths
- **Note**: The root URL shows nothing but establishes the base path

## Data Flow

### 1. User Profile & Grade Selection

**Profile Setup:**
- When users log in, they complete their profile including:
  - Name
  - Role (Student, Teacher, Admin, etc.)
  - Grade (For students: Class1 through Class12)

**Database Schema:**
```typescript
userProfiles: {
  userId: Id<"users">,
  name: string,
  role: string,
  grade?: string  // Optional, required for students
}
```

### 2. Directory Structure

The library follows this hierarchy:

```
https://eduscrape-host.web.app/
├── Class1/
│   ├── Language/
│   │   ├── English/
│   │   │   └── English.zip
│   │   └── Sanskrit/
│   │       └── Sanskrit.zip
│   ├── Maths/
│   │   └── Maths.zip
│   └── Science/
│       └── Science.zip
├── Class2/
│   └── ... (similar structure)
└── Class12/
    └── ... (similar structure)
```

### 3. Navigation Flow

#### Step 1: Start at Root
- URL: `https://eduscrape-host.web.app/`
- User sees nothing but system establishes base path

#### Step 2: Grade Selection
- Student's profile grade determines first folder level
- Example: Student with grade "Class1" → `/Class1`
- URL becomes: `https://eduscrape-host.web.app/Class1`

#### Step 3: Subject Selection (Category 1)
- UI displays sub-folders under selected grade
- Each folder represents a subject
- Examples:
  - Language → `https://eduscrape-host.web.app/Class1/Language`
  - Maths → `https://eduscrape-host.web.app/Class1/Maths`
  - Science → `https://eduscrape-host.web.app/Class1/Science`

#### Step 4: Sub-Subject Drill Down (if applicable)
- Some subjects have nested folders
- Example: Language → English/Sanskrit
- URL: `https://eduscrape-host.web.app/Class1/Language/English`

#### Step 5: ZIP File Selection
- Leaf folders contain one or more ZIP archives
- Each ZIP represents a collection of PDF chapters
- Examples:
  - `https://eduscrape-host.web.app/Class1/Language/English/English.zip`
  - `https://eduscrape-host.web.app/Class1/Maths/Maths.zip`

#### Step 6: Download & Unzip
- User clicks a ZIP file
- App performs HTTP GET to download ZIP
- ZIP is processed in-browser using JSZip library

#### Step 7: PDF Extraction
- JSZip opens the downloaded archive
- Filters for PDF files (*.pdf)
- Creates Blob objects for each PDF
- Generates object URLs using `URL.createObjectURL()`

#### Step 8: PDF Display
- UI shows list/grid of available PDFs
- Each PDF has:
  - Preview button (Eye icon)
  - Download button
- Clicking View opens PDF in embedded viewer
- PDF viewer uses `<embed>` tag for in-app display

## Data Sources

### structure.json
- Contains complete hierarchical tree
- Format: Nested object representing folder structure
- Used for: Building navigable tree UI

```json
{
  "Class1": {
    "Language": {
      "English": [
        {
          "name": "English.zip",
          "path": "Class1/Language/English/English.zip",
          "url": "https://eduscrape-host.web.app/Class1/Language/English/English.zip"
        }
      ]
    }
  }
}
```

### zips.json
- Flat list of all ZIP files
- Includes full path and direct download URL
- Used for: Quick filtering and direct access

```json
[
  {
    "name": "English.zip",
    "path": "Class1/Language/English/English.zip",
    "url": "https://eduscrape-host.web.app/Class1/Language/English/English.zip"
  }
]
```

## Implementation Details

### Library Component Features

1. **Automatic Grade Detection**
   - Reads user's grade from profile
   - Auto-navigates to their grade folder on load

2. **Breadcrumb Navigation**
   - Shows current path
   - Allows jumping to any parent folder
   - Home button returns to grade level

3. **Smart Navigation**
   - Distinguishes folders from ZIP files
   - Shows appropriate icons for each type
   - Handles multiple ZIPs in same folder

4. **PDF Management**
   - In-browser ZIP extraction
   - Memory-efficient Blob handling
   - Full-screen PDF viewer
   - Download individual PDFs

5. **Error Handling**
   - Network failure detection
   - Invalid path handling
   - Empty folder states
   - User-friendly error messages

### User Experience Flow

```
Login → Profile Setup (includes grade) → Dashboard
  ↓
Library Tab
  ↓
Auto-show Grade Level (e.g., Class1)
  ↓
Browse Subjects (Language, Maths, Science)
  ↓
Select Subject → Navigate Sub-folders
  ↓
Select ZIP File → Download & Extract
  ↓
View List of PDFs
  ↓
Select PDF → View or Download
```

## Key Features

1. **Single Entry Point**: All navigation starts from user's grade
2. **No External Navigation**: Everything happens within the app
3. **Client-Side Processing**: ZIP extraction done in browser
4. **Instant Access**: No server-side processing required
5. **Responsive Design**: Works on desktop and mobile
6. **Grade-Aware**: Content filtered by student's grade level

## Technical Stack

- **Frontend**: React + TypeScript
- **State Management**: React Hooks
- **Backend**: Convex (for user profiles)
- **File Storage**: Firebase Hosting
- **ZIP Processing**: JSZip library
- **PDF Viewing**: Native browser embed

## Security & Access

- All files publicly accessible via Firebase hosting
- No authentication required for file access
- User profile determines default grade view
- Manual grade selector available for exploration

## Future Enhancements

- Bookmarking favorite PDFs
- Reading progress tracking
- Offline mode with cached ZIPs
- Search across all PDFs
- Notes and annotations
