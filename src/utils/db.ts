import type { FileItem, Solution } from "@/store/problems-store";

// 数据库配置
const DB_NAME = "SkidHomeworkDB";
const DB_VERSION = 2; // 升级版本以支持新的 schema

// Object Store 名称
const STORES = {
  FILE_ITEMS: "fileItems",
  SOLUTIONS: "solutions", 
  APP_STATE: "appState",
} as const;

// 应用状态接口
export interface AppState {
  selectedImage?: string;
  selectedProblem: number;
}

// 持久化的 FileItem 接口（File 对象转为 Blob）
export interface PersistedFileItem {
  id: string;
  fileBlob: Blob;
  mimeType: string;
  source: "upload" | "camera";
  status: "success" | "pending" | "failed";
  fileName: string;
  lastModified: number;
}

// 数据库操作类
class DatabaseManager {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // 创建 fileItems store
        if (!db.objectStoreNames.contains(STORES.FILE_ITEMS)) {
          const fileItemsStore = db.createObjectStore(STORES.FILE_ITEMS, {
            keyPath: "id",
          });
          fileItemsStore.createIndex("source", "source", { unique: false });
        }

        // 创建或升级 solutions store
        if (oldVersion < 2) {
          // 如果是从版本 1 升级，需要删除旧的 store 并重新创建
          if (db.objectStoreNames.contains(STORES.SOLUTIONS)) {
            db.deleteObjectStore(STORES.SOLUTIONS);
          }
          // 创建新的 solutions store，使用 fileItemId 作为 keyPath
          db.createObjectStore(STORES.SOLUTIONS, {
            keyPath: "fileItemId",
          });
        }

        // 创建 appState store
        if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
          db.createObjectStore(STORES.APP_STATE, {
            keyPath: "key",
          });
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error("Database initialization failed");
    }
    return this.db;
  }

  /**
   * 保存文件项到数据库
   */
  async saveFileItem(item: FileItem): Promise<void> {
    const db = await this.ensureDB();
    
    const persistedItem: PersistedFileItem = {
      id: item.id,
      fileBlob: item.file,
      mimeType: item.mimeType,
      source: item.source,
      status: item.status,
      fileName: item.file.name,
      lastModified: item.file.lastModified,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILE_ITEMS], "readwrite");
      const store = transaction.objectStore(STORES.FILE_ITEMS);
      const request = store.put(persistedItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save file item"));
    });
  }

  /**
   * 从数据库加载文件项
   */
  async loadFileItem(id: string): Promise<FileItem | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILE_ITEMS], "readonly");
      const store = transaction.objectStore(STORES.FILE_ITEMS);
      const request = store.get(id);

      request.onsuccess = () => {
        const persistedItem: PersistedFileItem = request.result;
        if (!persistedItem) {
          resolve(null);
          return;
        }

        // 重新创建 File 对象
        const file = new File([persistedItem.fileBlob], persistedItem.fileName, {
          type: persistedItem.mimeType,
          lastModified: persistedItem.lastModified,
        });

        const fileItem: FileItem = {
          id: persistedItem.id,
          file,
          mimeType: persistedItem.mimeType,
          url: URL.createObjectURL(file),
          source: persistedItem.source,
          status: persistedItem.status,
        };

        resolve(fileItem);
      };

      request.onerror = () => reject(new Error("Failed to load file item"));
    });
  }

  /**
   * 加载所有文件项
   */
  async loadAllFileItems(): Promise<FileItem[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILE_ITEMS], "readonly");
      const store = transaction.objectStore(STORES.FILE_ITEMS);
      const request = store.getAll();

      request.onsuccess = () => {
        const persistedItems: PersistedFileItem[] = request.result;
        const fileItems: FileItem[] = persistedItems.map((persistedItem) => {
          // 重新创建 File 对象
          const file = new File([persistedItem.fileBlob], persistedItem.fileName, {
            type: persistedItem.mimeType,
            lastModified: persistedItem.lastModified,
          });

          return {
            id: persistedItem.id,
            file,
            mimeType: persistedItem.mimeType,
            url: URL.createObjectURL(file),
            source: persistedItem.source,
            status: persistedItem.status,
          };
        });

        resolve(fileItems);
      };

      request.onerror = () => reject(new Error("Failed to load file items"));
    });
  }

  /**
   * 删除文件项
   */
  async deleteFileItem(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILE_ITEMS], "readwrite");
      const store = transaction.objectStore(STORES.FILE_ITEMS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete file item"));
    });
  }

  /**
   * 保存解决方案
   */
  async saveSolution(solution: Solution): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SOLUTIONS], "readwrite");
      const store = transaction.objectStore(STORES.SOLUTIONS);
      const request = store.put(solution);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save solution"));
    });
  }

  /**
   * 加载所有解决方案
   */
  async loadAllSolutions(): Promise<Solution[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SOLUTIONS], "readonly");
      const store = transaction.objectStore(STORES.SOLUTIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(new Error("Failed to load solutions"));
    });
  }

  /**
   * 删除解决方案
   */
  async deleteSolution(fileItemId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SOLUTIONS], "readwrite");
      const store = transaction.objectStore(STORES.SOLUTIONS);
      const request = store.delete(fileItemId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete solution"));
    });
  }

  /**
   * 保存应用状态
   */
  async saveAppState(state: AppState): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.APP_STATE], "readwrite");
      const store = transaction.objectStore(STORES.APP_STATE);
      const request = store.put({ key: "appState", ...state });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save app state"));
    });
  }

  /**
   * 加载应用状态
   */
  async loadAppState(): Promise<AppState | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.APP_STATE], "readonly");
      const store = transaction.objectStore(STORES.APP_STATE);
      const request = store.get("appState");

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { key, ...state } = result;
          resolve(state as AppState);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error("Failed to load app state"));
    });
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORES.FILE_ITEMS,
        STORES.SOLUTIONS,
        STORES.APP_STATE,
      ], "readwrite");

      let completed = 0;
      const total = 3;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      // 清空文件项
      const fileItemsStore = transaction.objectStore(STORES.FILE_ITEMS);
      const fileItemsRequest = fileItemsStore.clear();
      fileItemsRequest.onsuccess = checkComplete;
      fileItemsRequest.onerror = () => reject(new Error("Failed to clear file items"));

      // 清空解决方案
      const solutionsStore = transaction.objectStore(STORES.SOLUTIONS);
      const solutionsRequest = solutionsStore.clear();
      solutionsRequest.onsuccess = checkComplete;
      solutionsRequest.onerror = () => reject(new Error("Failed to clear solutions"));

      // 清空应用状态
      const appStateStore = transaction.objectStore(STORES.APP_STATE);
      const appStateRequest = appStateStore.clear();
      appStateRequest.onsuccess = checkComplete;
      appStateRequest.onerror = () => reject(new Error("Failed to clear app state"));
    });
  }
}

// 导出单例实例
export const dbManager = new DatabaseManager();
