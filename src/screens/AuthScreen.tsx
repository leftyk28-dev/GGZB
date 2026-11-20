import { FormEvent, useState } from "react";
import { AlertCircle } from "lucide-react";
import { GameState, signup, signin } from "../lib/gameApi";

type AuthScreenProps = {
  onAuthed: (state: GameState) => void;
};

type Mode = "signup" | "signin";

export function AuthScreen({ onAuthed }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signup");
  const [nickname, setNickname] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const request = isSignup
      ? signup(nickname.trim(), login.trim(), password, remember)
      : signin(login.trim(), password, remember);
    request
      .then(onAuthed)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Что-то пошло не так.");
      })
      .finally(() => setSubmitting(false));
  };

  const canSubmit =
    login.trim().length >= 3 &&
    password.length >= 6 &&
    (!isSignup || nickname.trim().length > 0) &&
    !submitting;

  return (
    <div className="nickname-screen">
      <form className="panel nickname-card" onSubmit={handleSubmit}>
        <h1 className="page-title pixel-welcome">GGZOMBIX</h1>
        <p className="page-subtitle">
          {isSignup ? "Создайте аккаунт." : "Вход в аккаунт."}
        </p>
        {isSignup && (
          <div className="field">
            <label htmlFor="nickname-input">Никнейм</label>
            <input
              id="nickname-input"
              type="text"
              maxLength={24}
              autoFocus
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setError(null);
              }}
              placeholder="Как вас увидят в игре"
            />
            <span className="hint">Отображается в игре. Изменить его нельзя.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="login-input">Логин</label>
          <input
            id="login-input"
            type="text"
            maxLength={24}
            autoFocus={!isSignup}
            autoComplete="username"
            value={login}
            onChange={(event) => {
              setLogin(event.target.value);
              setError(null);
            }}
            placeholder="Например, Zombie_King"
          />
          <span className="hint">От 3 до 24 символов: буквы, цифры, _ и -.</span>
        </div>
        <div className="field">
          <label htmlFor="password-input">Пароль</label>
          <input
            id="password-input"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="Минимум 6 символов"
          />
          <span className="hint">От 6 до 64 символов.</span>
        </div>
        <label className="remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>Запомнить меня</span>
        </label>
        {error && (
          <div className="auth-error" role="alert" aria-live="assertive">
            <AlertCircle size={20} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {submitting ? "Подождите..." : isSignup ? "Зарегистрироваться" : "Войти"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setError(null);
          }}
        >
          {isSignup ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
        </button>
      </form>
    </div>
  );
}
