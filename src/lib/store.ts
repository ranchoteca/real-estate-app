import { create } from 'zustand';

interface ReceiptItem {
  name: string;
  price: number;
  assignedTo: string[];
}

interface Person {
  id: string;
  name: string;
}

interface ScanData {
  scanId: string;
  restaurant: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  people: Person[]; // NUEVO: guardar personas
}

interface ScanStore {
  currentScan: ScanData | null;
  setScanData: (data: ScanData) => void;
  updateItem: (index: number, item: ReceiptItem) => void;
  addItem: (item: ReceiptItem) => void;
  removeItem: (index: number) => void;
  setPeople: (people: Person[]) => void; // NUEVO
  clearScan: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  currentScan: null,
  setScanData: (data) => set({ currentScan: data }),
  updateItem: (index, item) =>
    set((state) => {
      if (!state.currentScan) return state;
      const items = [...state.currentScan.items];
      items[index] = item;
      return {
        currentScan: {
          ...state.currentScan,
          items,
        },
      };
    }),
  addItem: (item) =>
    set((state) => {
      if (!state.currentScan) return state;
      return {
        currentScan: {
          ...state.currentScan,
          items: [...state.currentScan.items, item],
        },
      };
    }),
  removeItem: (index) =>
    set((state) => {
      if (!state.currentScan) return state;
      const items = state.currentScan.items.filter((_, i) => i !== index);
      return {
        currentScan: {
          ...state.currentScan,
          items,
        },
      };
    }),
  setPeople: (people) =>
    set((state) => {
      if (!state.currentScan) return state;
      return {
        currentScan: {
          ...state.currentScan,
          people,
        },
      };
    }),
  clearScan: () => set({ currentScan: null }),
}));