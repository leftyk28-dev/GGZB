import { useState } from "react";
import { Check, Compass, Map, Shield, Sparkles } from "lucide-react";

type ExpeditionTab = "send" | "characters";

type Character = {
  id: string;
  name: string;
  role: string;
  image: string;
  color: string;
};

const CHARACTERS: Character[] = [
  {
    id: "survivor",
    name: "Выживший",
    role: "Универсал",
    image: "/case 31 генерал/IMG_5496.jpeg",
    color: "#9b7653",
  },
  {
    id: "scout",
    name: "Разведчик",
    role: "Тихий следопыт",
    image: "/case 31 генерал/IMG_5495.jpeg",
    color: "#657044",
  },
  {
    id: "guardian",
    name: "Страж",
    role: "Защитник отряда",
    image: "/case 31 генерал/IMG_5494.jpeg",
    color: "#3b78a6",
  },
  {
    id: "commander",
    name: "Командир",
    role: "Тактик",
    image: "/case 31 генерал/IMG_5493.jpeg",
    color: "#416990",
  },
  {
    id: "hunter",
    name: "Охотник",
    role: "Искатель добычи",
    image: "/case 31 генерал/IMG_5492.jpeg",
    color: "#8d8a33",
  },
];

export function ExpeditionScreen() {
  const [activeTab, setActiveTab] = useState<ExpeditionTab>("send");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const selectedCharacter = CHARACTERS.find((character) => character.id === selectedId) ?? null;

  const selectCharacter = (character: Character) => {
    setSelectedId(character.id);
    setSent(false);
    setActiveTab("send");
  };

  return (
    <section className="expedition-screen">
      <div className="expedition-hero">
        <div className="expedition-hero-orbit expedition-hero-orbit-one" />
        <div className="expedition-hero-orbit expedition-hero-orbit-two" />
        <div className="expedition-hero-content">
          <span className="eyebrow expedition-eyebrow"><Compass size={15} /> Экспедиция</span>
          <h1 className="page-title">Поход</h1>
          <p className="page-subtitle">Соберите отряд и отправьте героя за редкой добычей</p>
        </div>
        <Map className="expedition-hero-icon" size={100} strokeWidth={1} aria-hidden="true" />
      </div>

      <div className="expedition-tabs" role="tablist" aria-label="Разделы похода">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "send"}
          className={`expedition-tab ${activeTab === "send" ? "expedition-tab-active" : ""}`}
          onClick={() => setActiveTab("send")}
        >
          <Compass size={18} />
          Отправить в поход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "characters"}
          className={`expedition-tab ${activeTab === "characters" ? "expedition-tab-active" : ""}`}
          onClick={() => setActiveTab("characters")}
        >
          <Shield size={18} />
          Выбрать персонажа
        </button>
      </div>

      {activeTab === "send" ? (
        <section className="expedition-send-panel panel">
          <div className="section-head">
            <div>
              <h2 className="section-title">Готовы к выходу?</h2>
              <p className="hint">Выберите персонажа, который отправится исследовать заражённую зону.</p>
            </div>
            <span className="expedition-status-dot" aria-label="Поход доступен" />
          </div>

          {selectedCharacter ? (
            <div className="expedition-selected-character" style={{ "--character-color": selectedCharacter.color } as React.CSSProperties}>
              <div className="expedition-selected-image-wrap">
                <img src={selectedCharacter.image} alt={selectedCharacter.name} className="expedition-selected-image" />
              </div>
              <div className="expedition-selected-info">
                <span className="hint">Выбранный персонаж</span>
                <h3>{selectedCharacter.name}</h3>
                <p>{selectedCharacter.role}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("characters")}>
                Сменить
              </button>
            </div>
          ) : (
            <button type="button" className="expedition-empty-choice" onClick={() => setActiveTab("characters")}>
              <span className="expedition-empty-icon"><Shield size={26} /></span>
              <span>
                <strong>Персонаж не выбран</strong>
                <small>Откройте список и выберите героя для похода</small>
              </span>
              <span className="expedition-empty-arrow">→</span>
            </button>
          )}

          <div className="expedition-mission-card">
            <div className="expedition-mission-icon"><Sparkles size={20} /></div>
            <div>
              <strong>Тёмные окраины</strong>
              <p>Опасность: средняя · Награда: неизвестна</p>
            </div>
          </div>

          {sent && (
            <div className="expedition-success" role="status">
              <Check size={18} /> {selectedCharacter?.name} отправлен в поход.
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block expedition-send-button"
            disabled={!selectedCharacter || sent}
            onClick={() => setSent(true)}
          >
            {sent ? "Персонаж в походе" : "Отправить в поход"}
          </button>
        </section>
      ) : (
        <section className="expedition-characters-section">
          <div className="section-head expedition-section-head">
            <div>
              <h2 className="section-title">Персонажи</h2>
              <p className="hint">Нажмите на карточку, чтобы выбрать героя</p>
            </div>
            <span className="case-category-count">{CHARACTERS.length}</span>
          </div>
          <div className="expedition-character-grid">
            {CHARACTERS.map((character) => {
              const isSelected = character.id === selectedId;
              return (
                <button
                  key={character.id}
                  type="button"
                  className={`expedition-character-card ${isSelected ? "expedition-character-card-selected" : ""}`}
                  style={{ "--character-color": character.color } as React.CSSProperties}
                  onClick={() => selectCharacter(character)}
                >
                  <span className="expedition-character-image-wrap">
                    <img src={character.image} alt={character.name} className="expedition-character-image" />
                    {isSelected && <span className="expedition-character-check"><Check size={16} /></span>}
                  </span>
                  <span className="expedition-character-name">{character.name}</span>
                  <span className="expedition-character-role">{character.role}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
