import { create } from 'zustand'

interface UiState {
  modalCount: number       // quantos modais/overlays abertos
  openModal: () => void
  closeModal: () => void
}

/** Controle global de overlays — usado para esconder bottom nav/FAB quando há modal aberto */
export const useUiStore = create<UiState>((set) => ({
  modalCount: 0,
  openModal: () => set(s => ({ modalCount: s.modalCount + 1 })),
  closeModal: () => set(s => ({ modalCount: Math.max(0, s.modalCount - 1) })),
}))
