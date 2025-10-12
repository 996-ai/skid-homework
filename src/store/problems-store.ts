import { create } from "zustand";
import { dbManager, type AppState } from "@/utils/db";

// Type definition for an image item in the upload list.
export type FileItem = {
  id: string; // Unique identifier for each item
  file: File; // The actual image file
  mimeType: string;
  url: string; // Object URL for client-side preview
  source: "upload" | "camera"; // Origin of the image
  status: "success" | "pending" | "failed";
  streamingText?: string;  // 新增：流式文本内容
  isStreaming?: boolean;    // 新增：是否正在流式传输
};

// Type definition for the solution set of a single image.
export type Solution = {
  fileItemId: string; // ID of the source FileItem, used as a stable key
  success: boolean; // Whether the AI processing was successful
  problems: ProblemSolution[]; // Array of problems found in the image
};

export type ProblemSolution = {
  problem: string;
  answer: string;
  explanation: string;
};

// The new interface for our store's state and actions.
export interface ProblemsState {
  // --- STATE ---
  imageItems: FileItem[];
  imageSolutions: Solution[];
  selectedImage?: string;
  selectedProblem: number;
  isWorking: boolean;

  // --- ACTIONS ---

  // Actions for managing image items
  addFileItems: (items: FileItem[]) => void;
  updateItemStatus: (id: string, status: FileItem["status"]) => void;
  removeImageItem: (id: string) => void;
  updateProblem: (
    fileItemId: string,
    problemIndex: number,
    newAnswer: string,
    newExplanation: string,
  ) => void;
  clearAllItems: () => void;

  // Actions for managing image solutions
  addSolution: (solution: Solution) => void;
  removeSolutionsByFileItemIds: (fileItemIds: Set<string>) => void;
  clearAllSolutions: () => void;

  // Actions for managing selection state
  setSelectedImage: (image?: string) => void;
  setSelectedProblem: (index: number) => void;

  // Actions to update is working
  setWorking: (isWorking: boolean) => void;

  // Actions for streaming text
  setItemStreamingText: (id: string, text: string) => void;
  clearItemStreamingText: (id: string) => void;

  // Actions for persistence
  loadFromDB: () => Promise<void>;
  clearAllWithDB: () => Promise<void>;
}

export const useProblemsStore = create<ProblemsState>((set) => ({
  // --- INITIAL STATE ---
  imageItems: [],
  imageSolutions: [],
  selectedImage: undefined,
  selectedProblem: 0,
  isWorking: false,

  // --- ACTION IMPLEMENTATIONS ---

  /**
   * Adds new image items to the list.
   * This uses the functional form of `set` to prevent race conditions
   * when adding items from multiple sources.
   */
  addFileItems: (newItems) => {
    set((state) => ({ imageItems: [...state.imageItems, ...newItems] }));
    
    // 异步保存到数据库
    newItems.forEach((item) => {
      dbManager.saveFileItem(item).catch((error) => {
        console.error("Failed to save file item to database:", error);
      });
    });
  },

  /**
   * Updates the status of a specific image item.
   * This is concurrency-safe because it operates on the latest state.
   */
  updateItemStatus: (id, status) => {
    set((state) => ({
      imageItems: state.imageItems.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    }));
    
    // 异步更新数据库中的状态
    const item = useProblemsStore.getState().imageItems.find(i => i.id === id);
    if (item) {
      const updatedItem = { ...item, status };
      dbManager.saveFileItem(updatedItem).catch((error) => {
        console.error("Failed to update file item status in database:", error);
      });
    }
  },

  /**
   * Removes a single image item by its ID.
   */
  removeImageItem: (id) => {
    set((state) => ({
      imageItems: state.imageItems.filter((item) => item.id !== id),
    }));
    
    // 异步从数据库删除
    dbManager.deleteFileItem(id).catch((error) => {
      console.error("Failed to delete file item from database:", error);
    });
  },

  updateProblem: (
    fileItemId: string,
    problemIndex: number,
    newAnswer: string,
    newExplanation: string,
  ) => {
    set((state) => ({
      imageSolutions: state.imageSolutions.map((solution) => {
        if (solution.fileItemId === fileItemId) {
          const updatedProblems = [...solution.problems];

          updatedProblems[problemIndex] = {
            ...updatedProblems[problemIndex],
            answer: newAnswer,
            explanation: newExplanation,
          };

          return { ...solution, problems: updatedProblems };
        }
        return solution;
      }),
    }));
    
    // 异步更新数据库中的解决方案
    const updatedSolution = useProblemsStore.getState().imageSolutions.find(
      s => s.fileItemId === fileItemId
    );
    if (updatedSolution) {
      dbManager.saveSolution(updatedSolution).catch((error) => {
        console.error("Failed to update solution in database:", error);
      });
    }
  },

  /**
   * Clears all image items from the state.
   */
  clearAllItems: () => set({ imageItems: [] }),

  /**
   * Adds a new image solution to the list.
   * This is the core fix for the concurrency issue. By appending to the previous state
   * within the `set` function, we ensure no solution overwrites another.
   */
  addSolution: (newSolution) => {
    set((state) => ({
      imageSolutions: [...state.imageSolutions, newSolution],
    }));
    
    // 异步保存到数据库
    dbManager.saveSolution(newSolution).catch((error) => {
      console.error("Failed to save solution to database:", error);
    });
  },

  /**
   * Removes solutions associated with a given set of file item IDs.
   * Useful for reprocessing failed items without creating duplicates.
   */
  removeSolutionsByFileItemIds: (fileItemIdsToRemove) => {
    set((state) => ({
      imageSolutions: state.imageSolutions.filter(
        (sol) => !fileItemIdsToRemove.has(sol.fileItemId),
      ),
    }));
    
    // 异步从数据库删除解决方案
    fileItemIdsToRemove.forEach((fileItemId) => {
      dbManager.deleteSolution(fileItemId).catch((error) => {
        console.error("Failed to delete solution from database:", error);
      });
    });
  },

  /**
   * Clears all solutions from the state.
   */
  clearAllSolutions: () => set({ imageSolutions: [] }),

  // Simple setters for selection state
  setSelectedImage: (selectedImage) => {
    set({ selectedImage });
    
    // 异步保存应用状态
    const currentState = useProblemsStore.getState();
    const appState: AppState = {
      selectedImage,
      selectedProblem: currentState.selectedProblem,
    };
    dbManager.saveAppState(appState).catch((error) => {
      console.error("Failed to save app state:", error);
    });
  },
  setSelectedProblem: (selectedProblem) => {
    set({ selectedProblem });
    
    // 异步保存应用状态
    const currentState = useProblemsStore.getState();
    const appState: AppState = {
      selectedImage: currentState.selectedImage,
      selectedProblem,
    };
    dbManager.saveAppState(appState).catch((error) => {
      console.error("Failed to save app state:", error);
    });
  },

  setWorking: (isWorking) => set({ isWorking }),

  // Streaming text actions
  setItemStreamingText: (id, text) => {
    set((state) => ({
      imageItems: state.imageItems.map((item) =>
        item.id === id ? { ...item, streamingText: text, isStreaming: true } : item
      ),
    }));
  },
  clearItemStreamingText: (id) => {
    set((state) => ({
      imageItems: state.imageItems.map((item) =>
        item.id === id ? { ...item, streamingText: "", isStreaming: false } : item
      ),
    }));
  },

  // Persistence actions
  loadFromDB: async () => {
    try {
      // 初始化数据库
      await dbManager.initDB();
      
      // 加载文件项
      const fileItems = await dbManager.loadAllFileItems();
      
      // 加载解决方案
      const solutions = await dbManager.loadAllSolutions();
      
      // 加载应用状态
      const appState = await dbManager.loadAppState();
      
      // 更新状态
      set({
        imageItems: fileItems,
        imageSolutions: solutions,
        selectedImage: appState?.selectedImage,
        selectedProblem: appState?.selectedProblem ?? 0,
      });
      
      console.log("Successfully loaded data from database");
    } catch (error) {
      console.error("Failed to load data from database:", error);
    }
  },

  clearAllWithDB: async () => {
    try {
      // 清理 Object URLs
      const currentItems = useProblemsStore.getState().imageItems;
      currentItems.forEach((item) => URL.revokeObjectURL(item.url));
      
      // 清空数据库
      await dbManager.clearAll();
      
      // 清空状态
      set({
        imageItems: [],
        imageSolutions: [],
        selectedImage: undefined,
        selectedProblem: 0,
      });
      
      console.log("Successfully cleared all data");
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  },
}));
