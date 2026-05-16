import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  phoneNumber: null,
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  clearAuth: () => set({ phoneNumber: null }),
}));
