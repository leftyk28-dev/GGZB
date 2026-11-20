import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RANK_META, RANK_THRESHOLDS } from "../lib/ranks";
import { GoldAmount } from "./GoldAmount";

type RankRewardsModalProps = {
  currentIndex: number;
  onClose: () => void;
};

export function RankRewardsModal({ currentIndex, onClose }: RankRewardsModalProps) {
  const [viewIndex, setViewIndex] = useState(currentIndex);
  const maxIndex = RANK_META.length - 1;

  const goLeft = () => setViewIndex((i) => Math.max(0, i - 1));
  const goRight = () => setViewIndex((i) => Math.min(maxIndex, i + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goLeft();
      if (e.key === "ArrowRight") goRight();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rank = RANK_META[viewIndex];
  const Icon = rank.icon;
  const isCurrent = viewIndex === currentIndex;
  const isReached = viewIndex <= currentIndex;
  const threshold = RANK_THRESHOLDS[viewIndex];
  const nextThreshold = viewIndex < maxIndex ? RANK_THRESHOLDS[viewIndex + 1] : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rank-carousel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rank-carousel-header">
          <h2 className="section-title">Ранги</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <div className="rank-carousel-stage">
          <button
            type="button"
            className="rank-carousel-arrow rank-carousel-arrow-left"
            onClick={goLeft}
            disabled={viewIndex === 0}
            aria-label="Предыдущий ранг"
          >
            <ChevronLeft size={28} />
          </button>

          <div
            className="rank-carousel-card"
            style={{
              "--rank-color": rank.color,
              "--rank-glow": rank.glow,
              "--rank-gradient": rank.gradient,
            } as React.CSSProperties}
          >
            <div className="rank-carousel-glow" />
            <div className="rank-carousel-icon-ring">
              <Icon size={48} strokeWidth={1.5} />
            </div>
            <span className="rank-carousel-tier">{rank.tier}</span>
            <h3 className="rank-carousel-name" style={{ color: rank.color }}>{rank.name}</h3>
            <div className="rank-carousel-reward">
              {rank.reward > 0 ? (
                <>
                  <span className="rank-carousel-reward-label">Награда</span>
                  <GoldAmount amount={rank.reward} />
                </>
              ) : (
                <span className="rank-carousel-reward-label">Стартовый ранг</span>
              )}
            </div>
            <div className="rank-carousel-xp">
              {nextThreshold ? `${threshold} — ${nextThreshold} XP` : `${threshold}+ XP`}
            </div>
            {isCurrent && <span className="rank-carousel-current-badge">Ваш ранг</span>}
            {!isReached && <span className="rank-carousel-locked">Не открыт</span>}
          </div>

          <button
            type="button"
            className="rank-carousel-arrow rank-carousel-arrow-right"
            onClick={goRight}
            disabled={viewIndex === maxIndex}
            aria-label="Следующий ранг"
          >
            <ChevronRight size={28} />
          </button>
        </div>

        <div className="rank-carousel-dots">
          {RANK_META.map((r, i) => (
            <button
              key={r.name}
              type="button"
              className={`rank-carousel-dot ${i === viewIndex ? "rank-carousel-dot-active" : ""} ${i <= currentIndex ? "rank-carousel-dot-reached" : ""}`}
              style={i === viewIndex ? { background: r.color } : undefined}
              onClick={() => setViewIndex(i)}
              aria-label={`${r.name}`}
            >
              {i <= currentIndex ? <span className="rank-carousel-dot-check" style={{ color: r.color }}>✓</span> : null}
            </button>
          ))}
        </div>

        <div className="rank-carousel-progress">
          <span className="hint">{viewIndex + 1} / {RANK_META.length}</span>
        </div>
      </div>
    </div>
  );
}
