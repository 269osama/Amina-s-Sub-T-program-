import { User, UserRole, SessionLog, UserProjectData, Subtitle } from "../types";

// Keys for LocalStorage
const USERS_KEY = 'ps_users';
const SESSIONS_KEY = 'ps_sessions';
const DATA_KEY = 'ps_user_data';
const CURRENT_USER_KEY = 'ps_current_user_id';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockBackend {
  
  // --- Authentication ---

  async signup(email: string, password: string, name: string): Promise<User> {
    await delay(800);
    const users = this.getUsers();
    
    // Basic check
    if (users.find(u => u.email === email)) {
      throw new Error("Account already exists");
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      name,
      role: 'user',
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    users.push(newUser);
    this.saveUsers(users);
    this.startSession(newUser);
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    
    return newUser;
  }

  async login(identifier: string, password: string): Promise<User> {
    await delay(1200); // Longer delay for "security check" effect
    
    // --- HARDCODED ADMIN CHECK FOR VERCEL DEPLOYMENT ---
    // In a real backend, this would be in the database, hashed, and secured.
    // Client-side credential checking is NOT secure but requested for this specific demo/deployment.
    if (identifier === 'oussanat' && password === 'oussanat98') {
       const adminUser: User = {
          id: 'admin_static_01',
          email: 'admin@amina.work',
          name: 'Oussanat (Admin)',
          role: 'admin',
          createdAt: Date.now(),
          lastLoginAt: Date.now()
       };
       this.startSession(adminUser);
       localStorage.setItem(CURRENT_USER_KEY, adminUser.id);
       return adminUser;
    }
    // ---------------------------------------------------

    const users = this.getUsers();
    // Check email match
    const user = users.find(u => u.email === identifier || u.name === identifier);

    if (!user) {
      throw new Error("Access Denied: Invalid credentials");
    }

    // For non-admin demo users, we accept any password if the user exists
    // (Since we aren't hashing passwords in this mock)
    
    user.lastLoginAt = Date.now();
    this.saveUsers(users);
    this.startSession(user);
    localStorage.setItem(CURRENT_USER_KEY, user.id);

    return user;
  }

  logout() {
    const userId = localStorage.getItem(CURRENT_USER_KEY);
    if (userId) {
      this.endSession(userId);
    }
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  getCurrentUser(): User | null {
    const userId = localStorage.getItem(CURRENT_USER_KEY);
    
    // Hydrate static admin if key matches
    if (userId === 'admin_static_01') {
        return {
            id: 'admin_static_01',
            email: 'admin@amina.work',
            name: 'Oussanat (Admin)',
            role: 'admin',
            createdAt: Date.now(),
            lastLoginAt: Date.now()
        };
    }

    if (!userId) return null;
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  // --- Data Persistence ---

  async saveUserWork(userId: string, subtitles: Subtitle[], mediaName?: string) {
    await delay(200); // slight debounce simulation
    const allData = this.getAllProjectData();
    
    const userData: UserProjectData = {
      userId,
      subtitles,
      lastEdited: Date.now(),
      mediaName: mediaName || 'Untitled Project'
    };

    // Update or add
    const existingIndex = allData.findIndex(d => d.userId === userId);
    if (existingIndex >= 0) {
      allData[existingIndex] = userData;
    } else {
      allData.push(userData);
    }

    localStorage.setItem(DATA_KEY, JSON.stringify(allData));
  }

  async loadUserWork(userId: string): Promise<UserProjectData | null> {
    await delay(500);
    const allData = this.getAllProjectData();
    return allData.find(d => d.userId === userId) || null;
  }

  // --- Admin / Logging ---

  private startSession(user: User) {
    const sessions = this.getSessions();
    const newSession: SessionLog = {
      id: `sess_${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      startTime: Date.now()
    };
    sessions.push(newSession);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  private endSession(userId: string) {
    const sessions = this.getSessions();
    // Find the last open session for this user
    const session = sessions.reverse().find(s => s.userId === userId && !s.endTime);
    if (session) {
      session.endTime = Date.now();
      session.durationSeconds = (session.endTime - session.startTime) / 1000;
      
      const allSessions = this.getSessions();
      const targetIndex = allSessions.findIndex(s => s.id === session.id);
      if (targetIndex >= 0) {
        allSessions[targetIndex] = session;
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(allSessions));
      }
    }
  }

  getAllSessions(): SessionLog[] {
    return this.getSessions().sort((a, b) => b.startTime - a.startTime);
  }

  getAllUsers(): User[] {
    return this.getUsers();
  }

  // --- Internal Helpers ---

  private getUsers(): User[] {
    const str = localStorage.getItem(USERS_KEY);
    return str ? JSON.parse(str) : [];
  }

  private saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private getSessions(): SessionLog[] {
    const str = localStorage.getItem(SESSIONS_KEY);
    return str ? JSON.parse(str) : [];
  }

  private getAllProjectData(): UserProjectData[] {
    const str = localStorage.getItem(DATA_KEY);
    return str ? JSON.parse(str) : [];
  }
}

export const mockBackend = new MockBackend();