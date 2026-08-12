// Detect passive event listener support
let supportsPassive = false;
/* eslint-disable */
try {
  /* @ts-ignore */
  window.addEventListener('test', null, Object.defineProperty({}, 'passive', {
    get: () => {
      supportsPassive = true;
    }
  }));
} catch (e) {}
/* eslint-enable */

export interface PoolItem {
  target: HTMLElement | Window | Document | undefined | null;
  type: string;
  listener: EventListenerOrEventListenerObject;
  // `| undefined` explicitly: callers thread an optional argument straight
  // through, and exactOptionalPropertyTypes forbids that otherwise.
  passive?: boolean | undefined;
}

class DOMEvents {
  declare private _pool: PoolItem[];

  constructor() {
    this._pool = [];
  }

  /**
   * Adds event listeners
   *
   * @param target
   * @param type Can be multiple, separated by space.
   * @param listener
   * @param passive
   */
  add(
    target: PoolItem['target'],
    type: PoolItem['type'],
    listener: PoolItem['listener'],
    passive?: PoolItem['passive']
  ): void {
    this._toggleListener(target, type, listener, passive);
  }

  /**
   * Removes event listeners
   */
  remove(
    target: PoolItem['target'],
    type: PoolItem['type'],
    listener: PoolItem['listener'],
    passive?: PoolItem['passive']
  ): void {
    this._toggleListener(target, type, listener, passive, true);
  }

  /**
   * Removes all bound events
   */
  removeAll(): void {
    this._pool.forEach((poolItem) => {
      this._toggleListener(
        poolItem.target,
        poolItem.type,
        poolItem.listener,
        poolItem.passive,
        true,
        true
      );
    });
    this._pool = [];
  }

  /**
   * Adds or removes event
   *
   * @param target
   * @param type
   * @param listener
   * @param passive
   * @param unbind Whether the event should be added or removed
   * @param skipPool Whether events pool should be skipped
   */
  private _toggleListener(
    target: PoolItem['target'],
    type: PoolItem['type'],
    listener: PoolItem['listener'],
    passive?: PoolItem['passive'],
    unbind?: boolean,
    skipPool?: boolean
  ): void {
    if (!target) {
      return;
    }

    const methodName = unbind ? 'removeEventListener' : 'addEventListener';
    const types = type.split(' ');
    types.forEach((eType) => {
      if (eType) {
        // Events pool is used to easily unbind all events when PhotoSwipe is closed,
        // so developer doesn't need to do this manually
        if (!skipPool) {
          if (unbind) {
            // Remove from the events pool
            this._pool = this._pool.filter((poolItem) => {
              return poolItem.type !== eType
                || poolItem.listener !== listener
                || poolItem.target !== target;
            });
          } else {
            // Add to the events pool
            this._pool.push({
              target,
              type: eType,
              listener,
              passive
            });
          }
        }

        // most PhotoSwipe events call preventDefault,
        // and we do not need browser to scroll the page
        const eventOptions = supportsPassive ? { passive: (passive || false) } : false;

        target[methodName](
          eType,
          listener,
          eventOptions
        );
      }
    });
  }
}

export default DOMEvents;
