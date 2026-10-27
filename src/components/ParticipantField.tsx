import { MAX_NAME_LENGTH, sanitizeNameInput } from '../utils/participant';

interface ParticipantFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Необязательное имя участника. Живёт в общем состоянии приложения, поэтому
 * переживает перезагрузку и сразу подхватывается вердиктом и карточкой.
 */
export function ParticipantField({ value, onChange }: ParticipantFieldProps) {
  const length = Array.from(value).length;

  return (
    <div className="participant-strip">
      <div className="participant-copy">
        <label className="participant-label" htmlFor="participant-name">
          КТО СЕГОДНЯ В ГОВНО?
        </label>
        <p id="participant-help">
          Имя для вердикта и мем-карточки. Поле необязательное: без него всё работает
          как раньше.
        </p>
      </div>

      <div className="participant-input">
        <input
          id="participant-name"
          type="text"
          value={value}
          placeholder="Например, Кирилл"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby="participant-help participant-counter"
          onChange={(event) => onChange(sanitizeNameInput(event.target.value))}
        />
        <div className="participant-meta">
          <span id="participant-counter" className="participant-counter">
            {length} / {MAX_NAME_LENGTH} символов
          </span>
          {value ? (
            <button type="button" className="participant-clear" onClick={() => onChange('')}>
              Стереть
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
