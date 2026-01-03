# CollabDraw

A real-time collaborative whiteboard application built from scratch with a modern tech stack. Features custom drawing engine, WebSocket-based collaboration, and persistent storage—all organized in an efficient monorepo structure.

> **Note**: This application is currently optimized for desktop use only. Please use a desktop or laptop computer for the best experience. Mobile support is not available at this time.

## Features

- **Real-time Collaboration**: Multiple users can draw simultaneously with instant synchronization
- **Custom Drawing Engine**: Built from scratch without external drawing libraries for maximum control
- **Persistent Storage**: Drawings are saved and can be retrieved across sessions
- **User Authentication**: Secure login system with JWT tokens
- **Desktop Optimized**: Designed specifically for desktop and laptop computers
- **Type-safe**: Full TypeScript implementation across the entire stack

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Modern icon library
- **Axios** - HTTP client for API requests

### Backend
- **Express.js** - HTTP server for REST API
- **WebSocket (ws)** - Real-time communication server
- **Prisma** - Type-safe database ORM
- **JWT** - Authentication and authorization
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### Development & Tooling
- **Turborepo** - High-performance monorepo build system
- **pnpm** - Fast, disk space efficient package manager
- **ESLint** - Code linting and quality
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

## Architecture

### Monorepo Benefits
- **Shared Code**: Common types, utilities, and components across apps
- **Consistent Tooling**: Unified linting, formatting, and TypeScript configs
- **Efficient Builds**: Turborepo's intelligent caching and parallel execution
- **Type Safety**: End-to-end type safety from database to frontend

### Real-time Communication
- WebSocket server handles drawing events and user presence
- HTTP server manages authentication, user data, and drawing persistence
- Frontend maintains WebSocket connection for real-time updates

### Database Design
- User management with secure authentication
- Drawing storage with version control
- Room-based collaboration support

## Deployment

This application is deployed on AWS EC2 instances for production use. The deployment includes:

- **Frontend**: Next.js application served with optimized static assets
- **Backend Services**: Express.js HTTP server and WebSocket server running on separate instances
- **Database**: Managed database service for persistent storage
- **Load Balancing**: Configured for high availability and scalability

The project includes a deployment script (`deploy.sh`) for automated deployment. Configure your AWS credentials, environment variables, and database connection before deploying.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Inspired by the original [Excalidraw](https://excalidraw.com/) project, built with modern tools and practices for optimal performance and developer experience.
