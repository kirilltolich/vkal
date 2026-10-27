import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPersistedState, loadState, saveState } from './storage';

const STORAGE_KEY = 'v-govno:state:v1';

/** Подменяем localStorage, которого в node нет. */
function installStorage(raw?: string): Map<string, string> {
  const store = new Map<string, string>();
  if (raw !== undefined) store.set(STORAGE_KEY, raw);

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });

  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Так выглядело сохранение до появления имени участника. */
const legacySave = {
  entries: [
    { id: 'a', categoryId: 'beer', name: 'Пиво', volumeMl: 500, strength: 5, quantity: 2 },
  ],
  equivalentCategoryId: 'beer',
  equivalentStrength: '5',
};

describe('loadState', () => {
  it('читает старое сохранение без имени и без блока крови', () => {
    installStorage(JSON.stringify(legacySave));
    const state = loadState(new Date(2026, 9, 26, 21, 0));

    expect(state.name).toBe('');
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]?.volumeMl).toBe(500);
    expect(state.equivalentCategoryId).toBe('beer');
    expect(state.blood.startTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('нормализует имя из сохранения', () => {
    installStorage(JSON.stringify({ ...legacySave, name: '  Кирилл  ' }));
    expect(loadState().name).toBe('Кирилл');

    installStorage(JSON.stringify({ ...legacySave, name: 'Я'.repeat(50) }));
    expect(loadState().name).toHaveLength(30);

    installStorage(JSON.stringify({ ...legacySave, name: 'Кирилл 🍻' }));
    expect(loadState().name).toBe('Кирилл');

    installStorage(JSON.stringify({ ...legacySave, name: '🍻🍻' }));
    expect(loadState().name).toBe('');

    installStorage(JSON.stringify({ ...legacySave, name: 12345 }));
    expect(loadState().name).toBe('');
  });

  it('переживает сохранение и обратное чтение вместе с именем', () => {
    installStorage();
    const state = {
      ...createDefaultPersistedState(new Date(2026, 9, 26, 21, 0)),
      name: 'Кирилл Толич',
      entries: legacySave.entries.map((entry) => ({ ...entry, categoryId: 'beer' as const })),
    };

    expect(saveState(state)).toBe(true);
    const restored = loadState();

    expect(restored.name).toBe('Кирилл Толич');
    expect(restored.entries).toHaveLength(1);
    expect(restored.entries[0]?.name).toBe('Пиво');
  });

  it('не падает на испорченном JSON', () => {
    installStorage('{это не json');
    const state = loadState();

    expect(state.entries).toEqual([]);
    expect(state.name).toBe('');
  });

  it('отбрасывает битые позиции, но оставляет имя', () => {
    installStorage(
      JSON.stringify({
        ...legacySave,
        name: 'Кирилл',
        entries: [
          { id: 'bad', categoryId: 'beer', name: 'Пиво', volumeMl: -1, strength: 5, quantity: 1 },
          { id: 'bad2', categoryId: 'нет-такой', name: 'Пиво', volumeMl: 500, strength: 5, quantity: 1 },
          { id: 'ok', categoryId: 'wine', name: 'Вино', volumeMl: 200, strength: 12, quantity: 1 },
        ],
      }),
    );

    const state = loadState();
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]?.id).toBe('ok');
    expect(state.name).toBe('Кирилл');
  });
});

describe('значения по умолчанию', () => {
  it('новый посетитель получает пустое имя', () => {
    expect(createDefaultPersistedState().name).toBe('');
  });

  it('без localStorage приложение работает на значениях по умолчанию', () => {
    const state = loadState();
    expect(state.name).toBe('');
    expect(state.entries).toEqual([]);
  });
});
