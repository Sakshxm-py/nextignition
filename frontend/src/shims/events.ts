export class EventEmitter {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, listener: (...args: any[]) => void) {
    (this.listeners[event] ||= []).push(listener);
    return this;
  }

  addListener(event: string, listener: (...args: any[]) => void) {
    return this.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    const arr = this.listeners[event];
    if (!arr) return this;
    this.listeners[event] = arr.filter((l) => l !== listener);
    return this;
  }

  removeListener(event: string, listener: (...args: any[]) => void) {
    return this.off(event, listener);
  }

  emit(event: string, ...args: any[]) {
    const arr = this.listeners[event];
    if (!arr || arr.length === 0) return false;
    arr.slice().forEach((l) => l(...args));
    return true;
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }

  listenerCount(event: string) {
    return (this.listeners[event] || []).length;
  }
}

export default { EventEmitter };
