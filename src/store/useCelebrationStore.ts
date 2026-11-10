import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface CelebrationPayload {
  type: 'task' | 'milestone' | 'goal';
  title: string;
  subtitle?: string;
  badgeText?: string;
  progress?: number;
}

interface CelebrationState {
  celebration: CelebrationPayload | null;
  triggerCelebration: (payload: CelebrationPayload) => void;
  dismissCelebration: () => void;
}

function playCelebrationChimeWeb() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 victory arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.085);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        ctx.currentTime + idx * 0.085 + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + idx * 0.085 + 0.42
      );

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.085);
      osc.stop(ctx.currentTime + idx * 0.085 + 0.44);
    });
  } catch {
    // ignore audio errors
  }
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  celebration: null,

  triggerCelebration: (payload) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore on web
    }
    playCelebrationChimeWeb();
    set({ celebration: payload });
  },

  dismissCelebration: () => {
    set({ celebration: null });
  },
}));

