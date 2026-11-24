export type GameState =
  | 'TITLE'
  | 'SHOP'
  | 'SHIFT_INTRO'
  | 'PLAYING'
  | 'PAUSED'
  | 'SHIFT_SUMMARY'
  | 'GAME_OVER';

export interface StateHandler {
  onEnter?: (from: GameState | null) => void;
  onExit?: (to: GameState) => void;
  onUpdate?: (dt: number) => void;
  onRender?: (ctx: CanvasRenderingContext2D) => void;
}

const VALID_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  TITLE: ['SHIFT_INTRO', 'SHOP'],
  SHOP: ['TITLE', 'SHIFT_INTRO'],
  SHIFT_INTRO: ['PLAYING', 'TITLE'],
  PLAYING: ['PAUSED', 'SHIFT_SUMMARY', 'GAME_OVER', 'TITLE'],
  PAUSED: ['PLAYING', 'TITLE'],
  SHIFT_SUMMARY: ['SHIFT_INTRO', 'SHOP', 'TITLE'],
  GAME_OVER: ['SHIFT_INTRO', 'SHOP', 'TITLE'],
};

export class StateMachine {
  private current: GameState;
  private previous: GameState | null = null;
  private elapsedInState = 0;
  private readonly handlers = new Map<GameState, StateHandler>();

  constructor(initialState: GameState = 'TITLE') {
    this.current = initialState;
  }

  public register(state: GameState, handler: StateHandler): this {
    this.handlers.set(state, handler);
    return this;
  }

  public start(): void {
    this.elapsedInState = 0;
    this.handlers.get(this.current)?.onEnter?.(null);
  }

  public getState(): GameState {
    return this.current;
  }

  public getPreviousState(): GameState | null {
    return this.previous;
  }

  public getElapsed(): number {
    return this.elapsedInState;
  }

  public canTransition(next: GameState): boolean {
    if (next === this.current) return false;
    return VALID_TRANSITIONS[this.current].includes(next);
  }

  public transition(next: GameState): boolean {
    if (!this.canTransition(next)) {
      return false;
    }

    const from = this.current;
    this.handlers.get(from)?.onExit?.(next);
    this.previous = from;
    this.current = next;
    this.elapsedInState = 0;
    this.handlers.get(next)?.onEnter?.(from);
    return true;
  }

  public update(dt: number): void {
    this.elapsedInState += dt;
    this.handlers.get(this.current)?.onUpdate?.(dt);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.handlers.get(this.current)?.onRender?.(ctx);
  }
}
