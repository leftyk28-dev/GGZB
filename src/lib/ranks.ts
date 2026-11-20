import type { LucideIcon } from "lucide-react";
import {
  Shield,
  Swords,
  Award,
  Crown,
  Gem,
  Diamond,
  Medal,
  Flame,
  Skull,
  Star,
  Zap,
  Trophy,
} from "lucide-react";

export type RankMeta = {
  name: string;
  color: string;
  gradient: string;
  reward: number;
  icon: LucideIcon;
  tier: string;
  glow: string;
};

export const RANK_THRESHOLDS = [
  0, 45, 135, 270, 450, 720, 1080, 1530, 2070,
  2700, 3600, 4680, 6120, 7740, 9720, 12150, 14850, 18000,
  22500, 27000, 32400, 38700, 46800, 58500,
];

export function computeRankIndex(xp: number): number {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i]) return i;
  }
  return 0;
}

export const RANK_META: RankMeta[] = [
  { name: "BRONZE I", color: "#cd7f32", gradient: "linear-gradient(135deg, #8b4513, #cd7f32)", reward: 0, icon: Shield, tier: "Бронза", glow: "rgba(205, 127, 50, 0.4)" },
  { name: "BRONZE II", color: "#cd7f32", gradient: "linear-gradient(135deg, #8b4513, #cd7f32)", reward: 17, icon: Shield, tier: "Бронза", glow: "rgba(205, 127, 50, 0.4)" },
  { name: "BRONZE III", color: "#cd7f32", gradient: "linear-gradient(135deg, #8b4513, #cd7f32)", reward: 85, icon: Shield, tier: "Бронза", glow: "rgba(205, 127, 50, 0.4)" },
  { name: "SILVER I", color: "#c0c0c0", gradient: "linear-gradient(135deg, #6b6b6b, #c0c0c0)", reward: 170, icon: Swords, tier: "Серебро", glow: "rgba(192, 192, 192, 0.35)" },
  { name: "SILVER II", color: "#c0c0c0", gradient: "linear-gradient(135deg, #6b6b6b, #c0c0c0)", reward: 255, icon: Swords, tier: "Серебро", glow: "rgba(192, 192, 192, 0.35)" },
  { name: "SILVER III", color: "#c0c0c0", gradient: "linear-gradient(135deg, #6b6b6b, #c0c0c0)", reward: 340, icon: Swords, tier: "Серебро", glow: "rgba(192, 192, 192, 0.35)" },
  { name: "GOLD I", color: "#ffd700", gradient: "linear-gradient(135deg, #b8860b, #ffd700)", reward: 425, icon: Award, tier: "Золото", glow: "rgba(255, 215, 0, 0.4)" },
  { name: "GOLD II", color: "#ffd700", gradient: "linear-gradient(135deg, #b8860b, #ffd700)", reward: 595, icon: Award, tier: "Золото", glow: "rgba(255, 215, 0, 0.4)" },
  { name: "GOLD III", color: "#ffd700", gradient: "linear-gradient(135deg, #b8860b, #ffd700)", reward: 765, icon: Award, tier: "Золото", glow: "rgba(255, 215, 0, 0.4)" },
  { name: "ELITEGOLD I", color: "#ffb800", gradient: "linear-gradient(135deg, #cc8800, #ffb800)", reward: 1020, icon: Crown, tier: "Элит Gold", glow: "rgba(255, 184, 0, 0.4)" },
  { name: "ELITEGOLD II", color: "#ffb800", gradient: "linear-gradient(135deg, #cc8800, #ffb800)", reward: 1275, icon: Crown, tier: "Элит Gold", glow: "rgba(255, 184, 0, 0.4)" },
  { name: "ELITEGOLD III", color: "#ffb800", gradient: "linear-gradient(135deg, #cc8800, #ffb800)", reward: 1530, icon: Crown, tier: "Элит Gold", glow: "rgba(255, 184, 0, 0.4)" },
  { name: "DIAMOND I", color: "#b9f2ff", gradient: "linear-gradient(135deg, #0096b5, #b9f2ff)", reward: 1700, icon: Diamond, tier: "Алмаз", glow: "rgba(185, 242, 255, 0.4)" },
  { name: "DIAMOND II", color: "#b9f2ff", gradient: "linear-gradient(135deg, #0096b5, #b9f2ff)", reward: 2040, icon: Diamond, tier: "Алмаз", glow: "rgba(185, 242, 255, 0.4)" },
  { name: "DIAMOND III", color: "#b9f2ff", gradient: "linear-gradient(135deg, #0096b5, #b9f2ff)", reward: 2380, icon: Diamond, tier: "Алмаз", glow: "rgba(185, 242, 255, 0.4)" },
  { name: "PLATINUM I", color: "#e5e4e2", gradient: "linear-gradient(135deg, #5c9ca0, #e5e4e2)", reward: 2720, icon: Gem, tier: "Платинум", glow: "rgba(229, 228, 226, 0.35)" },
  { name: "PLATINUM II", color: "#e5e4e2", gradient: "linear-gradient(135deg, #5c9ca0, #e5e4e2)", reward: 3060, icon: Gem, tier: "Платинум", glow: "rgba(229, 228, 226, 0.35)" },
  { name: "PLATINUM III", color: "#e5e4e2", gradient: "linear-gradient(135deg, #5c9ca0, #e5e4e2)", reward: 3400, icon: Gem, tier: "Платинум", glow: "rgba(229, 228, 226, 0.35)" },
  { name: "TITAN I", color: "#ff5722", gradient: "linear-gradient(135deg, #bf360c, #ff5722)", reward: 3910, icon: Flame, tier: "Титан", glow: "rgba(255, 87, 34, 0.45)" },
  { name: "TITAN II", color: "#ff5722", gradient: "linear-gradient(135deg, #bf360c, #ff5722)", reward: 4420, icon: Flame, tier: "Титан", glow: "rgba(255, 87, 34, 0.45)" },
  { name: "TITAN III", color: "#ff5722", gradient: "linear-gradient(135deg, #bf360c, #ff5722)", reward: 5100, icon: Flame, tier: "Титан", glow: "rgba(255, 87, 34, 0.45)" },
  { name: "MASTER", color: "#ff1744", gradient: "linear-gradient(135deg, #b71c1c, #ff1744)", reward: 5950, icon: Skull, tier: "Мастер", glow: "rgba(255, 23, 68, 0.5)" },
  { name: "ELITE", color: "#00e676", gradient: "linear-gradient(135deg, #00c853, #00e676)", reward: 6800, icon: Zap, tier: "Элита", glow: "rgba(0, 230, 118, 0.5)" },
  { name: "ABSOLUTE", color: "#e91e63", gradient: "linear-gradient(135deg, #880e4f, #e91e63)", reward: 8500, icon: Trophy, tier: "Абсолют", glow: "rgba(233, 30, 99, 0.55)" },
];
