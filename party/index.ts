import type * as Party from "partykit/server";

interface RoomSettings {
  flipSpeed: number;
  staggerDelay: number;
  rotationInterval: number;
  volume: number;
  isMuted: boolean;
  theme: "dark" | "light";
}

interface MusicState {
  source: "off" | "radio" | "spotify" | "lastfm";
  isPlaying: boolean;
  currentTrack: { title: string; artist: string } | null;
  radioStation: { name: string; url: string } | null;
  lastfmUsername: string | null;
}

interface RoomState {
  settings: RoomSettings;
  currentContent: { lines: string[] } | null;
  musicState: MusicState;
  hostConnected: boolean;
  connectedClients: number;
}

type ClientMessage =
  | { type: "settings-update"; payload: Partial<RoomSettings> }
  | { type: "content-change"; payload: { lines: string[] } }
  | { type: "skip-next" }
  | { type: "music-control"; payload: MusicState }
  | { type: "request-state" }
  | { type: "register-host" };

type ServerMessage =
  | { type: "state-sync"; payload: RoomState }
  | { type: "settings-changed"; payload: Partial<RoomSettings> }
  | { type: "content-changed"; payload: { lines: string[] } }
  | { type: "skip" }
  | { type: "music-update"; payload: MusicState }
  | { type: "client-count"; payload: number };

const DEFAULT_SETTINGS: RoomSettings = {
  flipSpeed: 160,
  staggerDelay: 20,
  rotationInterval: 15,
  volume: 0.7,
  isMuted: false,
  theme: "dark",
};

export default class FlappyBoardsRoom implements Party.Server {
  state: RoomState;
  hostId: string | null = null;

  constructor(readonly room: Party.Room) {
    this.state = {
      settings: { ...DEFAULT_SETTINGS },
      currentContent: null,
      musicState: {
        source: "off",
        isPlaying: false,
        currentTrack: null,
        radioStation: null,
        lastfmUsername: null,
      },
      hostConnected: false,
      connectedClients: 0,
    };
  }

  onConnect(conn: Party.Connection) {
    this.state.connectedClients++;
    // Send current state to the new connection
    this.send(conn, { type: "state-sync", payload: this.state });
    // Broadcast updated client count
    this.broadcast({ type: "client-count", payload: this.state.connectedClients });
  }

  onClose() {
    this.state.connectedClients = Math.max(0, this.state.connectedClients - 1);
    if (this.state.connectedClients === 0) {
      this.state.hostConnected = false;
      this.hostId = null;
    }
    this.broadcast({ type: "client-count", payload: this.state.connectedClients });
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case "register-host":
        this.hostId = sender.id;
        this.state.hostConnected = true;
        break;

      case "settings-update":
        this.state.settings = { ...this.state.settings, ...msg.payload };
        this.broadcast(
          { type: "settings-changed", payload: msg.payload },
          [sender.id]
        );
        break;

      case "content-change":
        this.state.currentContent = msg.payload;
        this.broadcast(
          { type: "content-changed", payload: msg.payload },
          [sender.id]
        );
        break;

      case "skip-next":
        this.broadcast({ type: "skip" }, [sender.id]);
        break;

      case "music-control":
        this.state.musicState = msg.payload;
        this.broadcast(
          { type: "music-update", payload: msg.payload },
          [sender.id]
        );
        break;

      case "request-state":
        this.send(sender, { type: "state-sync", payload: this.state });
        break;
    }
  }

  send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  broadcast(msg: ServerMessage, exclude?: string[]) {
    const data = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      if (!exclude || !exclude.includes(conn.id)) {
        conn.send(data);
      }
    }
  }
}

FlappyBoardsRoom satisfies Party.Worker;
