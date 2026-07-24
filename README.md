*This project has been created as part of the 42 curriculum by <trindran>, <cramaros>, <nrakotom>, <srabeman>*

### Description
### Instruction
### Resources
 - **NestJS** : [official site documentation ] (https://docs.nestjs.com/)
 - **Prisma** : [official documentation ] (https://www.prisma.io/docs)
 - **Socket.IO** : [official documentation ] (https://socket.io/docs/v4/)
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

![Database Schema](diagram_prisma.png)

### Features List:

### Modules:
 - Major :
    - [x] Use a framework for the frontend and backend(React, NestJS).
    - [] Implement real-time features using WebSockets or similar technology.
    - [] Allow users to interact with other users
	
    - [x] Advanced Permission System *(frontend committed; backend changes are local & uncommitted — see `local_backend_changes.md`)*
    - [] Standard user management and authentication
	- [x] Module of choice (infinite canvas)
	- [] Monitoring system with Prometheus and Grafana.
	

 
- Minor :
    - [x] Use a frontend framework (React).
    - [x] Use a backend framework (NestJS).
    - [x] Use an ORM (Prisma) for the database.
    - [x] Health check and status page system with automated backups and disaster recovery procedures.
    - [x] A complete notification system for all creation, update, and deletion actions.
    - [x] File upload and management system
    - [x] Custom-made design system with reusable components, including a proper color palette, typography, and icons.
	- [x]  Implement advanced search functionality with filters, sorting, and pagination.
    - [x] Multilingue
    - [x] Support for additional browsers
    - [x] RTL Arabic
    - [x] GDPR compliance features *(frontend committed; backend changes are local & uncommitted — see `local_backend_changes.md`)*
	- [] file upload
	- [] Oauth2.0 authentication with Google or 42 API
	- [] User activity analytics and insights dashboard

Excpected points: 17/28

### Individual Contributions:
- trindran :
  - create prisma schema  
  - Implement basis user CRUD with the dto validation
  - Upload avatar, file and artwork with dto validation
  - follow, like, comment system

- nrakotom :
- cramaros :
  - Set up the complete development environment (frontend, backend, Docker, and service dependencies).
  - Implemented the health monitoring system, including health checks, the status page, automated PostgreSQL backups, and disaster recovery procedures.
- srabeman :



