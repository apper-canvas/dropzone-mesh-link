import sessionsData from '../mockData/uploadSessions.json';

let sessions = [...sessionsData];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const uploadSessionService = {
  async getAll() {
    await delay(250);
    return [...sessions];
  },

  async getById(id) {
    await delay(200);
    const session = sessions.find(s => s.id === id);
    return session ? { ...session } : null;
  },

  async create(sessionData) {
    await delay(300);
    const newSession = {
      id: Date.now().toString(),
      ...sessionData,
      startTime: sessionData.startTime || new Date().toISOString()
    };
    sessions = [newSession, ...sessions];
    return { ...newSession };
  },

  async update(id, updates) {
    await delay(250);
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Upload session not found');
    
    sessions[index] = { ...sessions[index], ...updates };
    return { ...sessions[index] };
  },

  async delete(id) {
    await delay(200);
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Upload session not found');
    
    const deletedSession = sessions[index];
    sessions = sessions.filter(s => s.id !== id);
    return { ...deletedSession };
  }
};

export default uploadSessionService;