# AI-Powered Transcript Summarization and Sharing Tool

## Overview

This is a full-stack web application built with React (frontend) and Express.js (backend) that allows users to upload transcript files, generate AI-powered summaries with custom prompts, edit those summaries, and share them via email. The application uses a modern tech stack with TypeScript throughout, shadcn/ui components for the frontend, Drizzle ORM for database management, and PostgreSQL for data persistence.

The application follows a monorepo structure with shared schema definitions between client and server, and provides a streamlined workflow for transcript processing and collaboration through email sharing functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

## Note : - Database Integration required for future  it is not done yet
 

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for development tooling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod schema validation for type-safe form processing
- **Routing**: Wouter for lightweight client-side routing
- **File Upload**: Custom drag-and-drop file upload component with validation

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API development
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Request Handling**: Express middleware for JSON parsing, URL encoding, and request logging
- **File Processing**: Multer middleware for handling multipart/form-data file uploads
- **Validation**: Zod schemas for runtime type validation and error handling
- **Development Setup**: Custom Vite integration for hot module replacement in development

### Data Storage Design
- **Database**: PostgreSQL with three main entities:
  - **Transcripts**: Store uploaded transcript content and metadata
  - **Summaries**: Link to transcripts with AI-generated content and custom prompts
  - **Email Shares**: Track email sharing events with recipient lists and settings
- **Schema Management**: Drizzle Kit for database migrations and schema evolution
- **Connection**: Uses @neondatabase/serverless for serverless PostgreSQL connectivity
- **Fallback Storage**: In-memory storage implementation for development/testing scenarios

### External Dependencies
- **Database**: PostgreSQL (configured for Neon serverless)
- **AI Integration**: Placeholder infrastructure for AI summary generation (implementation pending)
- **Email Service**: Placeholder infrastructure for email delivery (implementation pending)
- **File Storage**: Server-side memory storage for uploaded transcript files
- **Development Tools**: Replit-specific plugins for development environment integration
