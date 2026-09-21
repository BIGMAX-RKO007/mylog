export interface DomainEvent {
  eventName: string;
  occurredAt: number;
}

export class DocumentCommittedEvent implements DomainEvent {
  eventName = 'document.committed';
  occurredAt = Date.now();

  constructor(
    public readonly fileId: string,
    public readonly name: string,
    public readonly title: string,
    public readonly content: string,
    public readonly ownerRoleId: string,
    public readonly size: number
  ) {}
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler as EventHandler);
    this.handlers.set(eventName, list);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const list = this.handlers.get(event.eventName) || [];
    await Promise.allSettled(list.map((h) => h(event)));
  }
}

// 进程内共享的单例事件总线
export const globalEventBus = new EventBus();
