import filesData from '../mockData/files.json';

let files = [...filesData];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fileService = {
  async getAll() {
    await delay(300);
    return [...files];
  },

  async getById(id) {
    await delay(200);
    const file = files.find(f => f.id === id);
    return file ? { ...file } : null;
  },

  async create(fileData) {
    await delay(400);
    const newFile = {
      id: Date.now().toString(),
      ...fileData,
      uploadedAt: new Date().toISOString()
    };
    files = [newFile, ...files];
    return { ...newFile };
  },

  async update(id, updates) {
    await delay(300);
    const index = files.findIndex(f => f.id === id);
    if (index === -1) throw new Error('File not found');
    
    files[index] = { ...files[index], ...updates };
    return { ...files[index] };
  },

  async delete(id) {
    await delay(200);
    const index = files.findIndex(f => f.id === id);
    if (index === -1) throw new Error('File not found');
    
    const deletedFile = files[index];
    files = files.filter(f => f.id !== id);
    return { ...deletedFile };
  }
};

export default fileService;