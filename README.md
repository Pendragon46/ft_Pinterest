*This project has been created as part of the 42 curriculum by <trindran>, <cramaros>, <nrakotom>, <srabeman>*

### Description
### Instruction
### Resources
 - **NestJS** : [official site documentation ] (https://docs.nestjs.com/)
 - **Prisma** : [official documentation ] (https://www.prisma.io/docs)
### Team Information:
### Project Management:
### Technical Stack:
 - Backend :
   - NestJS
   - Prisma
   - PostgreSQL
- Frontend :
  - React
  - TypeScript
  
### Database Schema:
### Features List:
### Modules:
 - Major :
   - [x] Use a framework for both the frontend and backend.
   - [] Implement real-time features using WebSockets or similar technology.
   - [] Allow users to interact with other users 
   - [] Public API
   - [] Advanced Permission System
   - [] ELK Devops
   - [] Microservices
   - [] Standard user management and authentication

 
- Minor :
    - [x] Use a frontend framework (React).
   - [x] Use a backend framework (NestJS).
   - [x] Use an ORM (Prisma) for the database.
   - [] A complete notification system for all creation, update, and deletion actions.
   - []  Implement advanced search functionality with filters, sorting, and pagination.
   - [] File upload and management system
   - [] Custom-made design system with reusable components, including a proper color palette, typography, and icons.
   - [] Multilingue
   - [] Support for additional browsers
   - [] 2FA
   - [] RTL Arabic
   - [] Implement WAF/ModSecurity
   - [] Chat

### Individual Contributions:
- trindran :
  - create prisma schema  
  - Implement basis user CRUD with the dto validation
  - Upload avatar, file and artwork with dto validation
  - follow, like, comment system

- nrakotom :
- cramaros :
- srabeman :



## Minor Features

### Health Monitoring

The project includes health checks for all core services:

- Frontend
- Backend
- PostgreSQL
- Nginx

The backend exposes a `/health` endpoint used by Docker health checks and the status page.

### Automated Backups

A dedicated backup service automatically creates PostgreSQL database backups using `pg_dump`.

Features:

- scheduled backups using Supercronic
- timestamped SQL dump files
- automatic cleanup of old backups
- configurable backup retention

### Disaster Recovery

Recovery scripts are provided to restore the application after a database failure.

Available utilities:

```bash
make health      # Check application status
make restore     # Restore a specific backup
make recover     # Restore the latest backup