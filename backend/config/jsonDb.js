import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DB_FILE = path.join(process.cwd(), 'data', 'fallback_db.json');

// Ensure data directory exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize file if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], datasets: [], history: [] }, null, 2));
}

const readData = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], datasets: [], history: [] };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing fallback DB:', e);
  }
};

class MockQuery {
  constructor(result) {
    this.result = result;
  }
  
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
  
  select(arg) {
    if (this.result) {
      if (Array.isArray(this.result)) {
        this.result = this.result.map(item => {
          const newItem = { ...item };
          delete newItem.password;
          return newItem;
        });
      } else {
        const newItem = { ...this.result };
        delete newItem.password;
        this.result = newItem;
      }
    }
    return this;
  }
  
  sort(arg) {
    if (Array.isArray(this.result) && arg && arg.createdAt === -1) {
      this.result = [...this.result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return this;
  }
}

const userMethods = {
  findOne: (filter) => {
    const data = readData();
    let user = null;
    if (filter.email) {
      const filterEmail = String(filter.email || '').toLowerCase().trim();
      user = data.users.find(u => String(u.email || '').toLowerCase().trim() === filterEmail) || null;
    } else if (filter._id) {
      user = data.users.find(u => u._id === String(filter._id)) || null;
    }
    if (!user) return new MockQuery(null);

    // Attach matchPassword instance method
    const userObj = {
      ...user,
      matchPassword: async function(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
      }
    };
    return new MockQuery(userObj);
  },

  findById: (id) => {
    const data = readData();
    const strId = String(id || '');
    const user = data.users.find(u => u._id === strId || u.id === strId) || null;
    if (!user) return new MockQuery(null);
    const userObj = {
      ...user,
      matchPassword: async function(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
      }
    };
    return new MockQuery(userObj);
  },

  create: async (userData) => {
    const data = readData();
    // Pre-save hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = {
      _id: crypto.randomUUID(),
      ...userData,
      email: String(userData.email || '').toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeData(data);

    return {
      ...newUser,
      matchPassword: async function(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
      }
    };
  }
};

const datasetMethods = {
  create: async (datasetData) => {
    const data = readData();
    const newDataset = {
      _id: crypto.randomUUID(),
      ...datasetData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.datasets.push(newDataset);
    writeData(data);
    return newDataset;
  },
  
  find: (filter) => {
    const data = readData();
    let results = data.datasets;
    if (filter && filter.userId) {
      results = results.filter(d => d.userId === filter.userId);
    }
    return new MockQuery(results);
  },
  
  findOne: (filter) => {
    const data = readData();
    let results = data.datasets;
    if (filter) {
      if (filter._id) {
        results = results.filter(d => d._id === filter._id);
      }
      if (filter.userId) {
        results = results.filter(d => d.userId === filter.userId);
      }
    }
    return new MockQuery(results[0] || null);
  },
  
  findOneAndUpdate: async (filter, update, options = {}) => {
    const data = readData();
    const datasetIndex = data.datasets.findIndex(d => {
      let match = true;
      if (filter._id) match = match && d._id === filter._id;
      if (filter.userId) match = match && d.userId === filter.userId;
      return match;
    });
    
    if (datasetIndex === -1) return null;
    
    const dataset = data.datasets[datasetIndex];
    
    if (update.$set) {
      Object.assign(dataset, update.$set);
    } else {
      Object.assign(dataset, update);
    }
    
    if (update.$push) {
      for (const key in update.$push) {
        if (!dataset[key]) dataset[key] = [];
        if (update.$push[key] && update.$push[key].$each) {
          dataset[key].push(...update.$push[key].$each);
        } else {
          dataset[key].push(update.$push[key]);
        }
      }
    }
    
    dataset.updatedAt = new Date().toISOString();
    data.datasets[datasetIndex] = dataset;
    writeData(data);
    return dataset;
  },
  
  deleteOne: async (filter) => {
    const data = readData();
    const initialLength = data.datasets.length;
    data.datasets = data.datasets.filter(d => d._id !== filter._id);
    writeData(data);
    return { deletedCount: initialLength - data.datasets.length };
  }
};

const historyMethods = {
  create: async (historyData) => {
    const data = readData();
    const newLog = {
      _id: crypto.randomUUID(),
      ...historyData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.history.push(newLog);
    writeData(data);
    return newLog;
  },
  
  find: (filter) => {
    const data = readData();
    let results = data.history;
    if (filter && filter.userId) {
      results = results.filter(h => h.userId === filter.userId);
    }
    return new MockQuery(results);
  },
  
  findOne: (filter) => {
    const data = readData();
    let results = data.history;
    if (filter) {
      if (filter._id) {
        results = results.filter(h => h._id === filter._id);
      }
      if (filter.userId) {
        results = results.filter(h => h.userId === filter.userId);
      }
    }
    return new MockQuery(results[0] || null);
  },
  
  deleteOne: async (filter) => {
    const data = readData();
    const initialLength = data.history.length;
    data.history = data.history.filter(h => h._id !== filter._id);
    writeData(data);
    return { deletedCount: initialLength - data.history.length };
  }
};

export const getFallbackDb = (collectionName) => {
  if (collectionName === 'users') return userMethods;
  if (collectionName === 'datasets') return datasetMethods;
  if (collectionName === 'history') return historyMethods;
  return {};
};
