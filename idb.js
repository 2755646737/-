const IDB = {
  dbName: 'MatchDB',
  storeName: 'matches',
  version: 1,

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  addData(data) {
    return this.openDB().then(db => {
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.add({ ...data, createTime: new Date().toISOString() });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      });
    });
  },

  getAllData() {
    return this.openDB().then(db => {
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = (e) => {
          db.close();
          resolve(e.target.result);
        };
      });
    });
  },

  deleteData(ids) {
    return this.openDB().then(db => {
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      });
    });
  },

  clearData() {
    return this.openDB().then(db => {
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      });
    });
  }
};

window.IDB = IDB;