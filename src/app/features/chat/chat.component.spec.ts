import { RoomEvent } from 'livekit-client';
import { ChatComponent } from './chat.component';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

describe('ChatComponent - ciclo de llamadas de Mara', () => {
  function component(): ChatComponent {
    return new ChatComponent({} as any, {} as any);
  }

  it('el cierre tardío de una sala anterior no borra la llamada nueva', async () => {
    const instance = component() as any;
    const close = deferred();
    const oldMic = { stop: jasmine.createSpy('oldMic.stop') };
    const newMic = { stop: jasmine.createSpy('newMic.stop') };
    const oldRoom = {
      removeAllListeners: jasmine.createSpy('removeAllListeners'),
      disconnect: jasmine.createSpy('disconnect').and.returnValue(close.promise),
      localParticipant: { trackPublications: new Map() },
      remoteParticipants: new Map()
    };
    const newRoom = {};

    instance.livekitRoom = oldRoom;
    instance.maraMicrophoneTrack = oldMic;
    const closing = instance.disposeMaraAvatarRoom(oldRoom);

    expect(instance.livekitRoom).toBeNull();
    expect(oldMic.stop).toHaveBeenCalledTimes(1);

    instance.livekitRoom = newRoom;
    instance.maraMicrophoneTrack = newMic;
    close.resolve();
    await closing;

    expect(instance.livekitRoom).toBe(newRoom);
    expect(instance.maraMicrophoneTrack).toBe(newMic);
    expect(newMic.stop).not.toHaveBeenCalled();
  });

  it('desconecta cada sala una sola vez aunque el cierre se solicite dos veces', async () => {
    const instance = component() as any;
    const room = {
      removeAllListeners: jasmine.createSpy('removeAllListeners'),
      disconnect: jasmine.createSpy('disconnect').and.resolveTo(undefined),
      localParticipant: { trackPublications: new Map() },
      remoteParticipants: new Map()
    };
    instance.livekitRoom = room;

    await Promise.all([
      instance.disposeMaraAvatarRoom(room),
      instance.disposeMaraAvatarRoom(room)
    ]);

    expect(room.disconnect).toHaveBeenCalledTimes(1);
  });

  it('no marca la llamada activa hasta que el agente publica audio y está listo', async () => {
    const instance = component() as any;
    const listeners = new Map<RoomEvent, (...args: any[]) => void>();
    const participant = {
      attributes: { 'lk.agent.state': 'listening' },
      audioTrackPublications: new Map()
    };
    const room = {
      remoteParticipants: new Map([['mara', participant]]),
      on: (event: RoomEvent, callback: (...args: any[]) => void) => listeners.set(event, callback),
      off: (event: RoomEvent) => listeners.delete(event)
    };
    instance.livekitRoom = room;
    instance.maraCallAttempt = 7;

    let ready = false;
    const waiting = instance.waitForMaraReady(room, 7).then(() => { ready = true; });
    await Promise.resolve();
    expect(ready).toBeFalse();

    participant.audioTrackPublications.set('audio', { track: {} });
    listeners.get(RoomEvent.TrackSubscribed)?.();
    await waiting;
    expect(ready).toBeTrue();
  });
});
