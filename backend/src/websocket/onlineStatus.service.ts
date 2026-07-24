import { Injectable } from '@nestjs/common';

@Injectable()
export class OnlineStatusService {
  constructor() {}
  private onlineUsers = new Map<string, Set<string>>();

  addOnlineUser(socketId: string, userId: string) {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)?.add(socketId);
  }

  removeOnlineUser(userId: string, socketId: string) {
    if (this.onlineUsers.has(userId)) {
      const userSockets = this.onlineUsers.get(userId);
      userSockets?.delete(socketId);
      if (userSockets?.size === 0) {
        this.onlineUsers.delete(userId);
      }
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getSocketIdsForUser(userId: string): Set<string> | undefined {
    return this.onlineUsers.get(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}
