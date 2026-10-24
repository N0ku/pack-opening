import type { PackState } from './types.js';

/** Allowed transitions. `reset()` does not go through the machine: it builds a new one. */
export const TRANSITIONS = {
  idle: ['tearing'],
  tearing: ['idle', 'opening'],
  opening: ['revealing', 'complete'],
  revealing: ['complete'],
  complete: [],
} as const satisfies Record<PackState, readonly PackState[]>;

export class StateMachine {
  #state: PackState = 'idle';
  readonly #onChange: (state: PackState, previous: PackState) => void;

  constructor(onChange: (state: PackState, previous: PackState) => void) {
    this.#onChange = onChange;
  }

  get state(): PackState {
    return this.#state;
  }

  can(next: PackState): boolean {
    return (TRANSITIONS[this.#state] as readonly PackState[]).includes(next);
  }

  /** Moves to `next` if the transition is allowed. Returns whether it happened. */
  to(next: PackState): boolean {
    if (!this.can(next)) return false;
    const previous = this.#state;
    this.#state = next;
    this.#onChange(next, previous);
    return true;
  }
}
