import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

// Eventos internos: REST persiste primero y después notifica a los sockets.
@Injectable()
export class RoomEventsService {
  readonly changes = new Subject<{ projectId: string; type: string; payload: unknown }>();
  publish(projectId: string, type: string, payload: unknown) {
    this.changes.next({ projectId, type, payload });
  }
}
