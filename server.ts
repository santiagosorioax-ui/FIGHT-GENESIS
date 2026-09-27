import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use('/audio', express.static(path.resolve(__dirname, 'public/audio')));
app.use(express.static(path.resolve(__dirname, 'public')));

interface PlayerSession {
  ws: WebSocket;
  id: string;
  name: string;
  fighterId: string;
  ready: boolean;
  ping: number;
}

interface Room {
  id: string;
  stageId: string;
  players: PlayerSession[];
  state: 'LOBBY' | 'FIGHTING' | 'ENDED';
  createdAt: number;
}

const rooms = new Map<string, Room>();
let matchmakingQueue: PlayerSession | null = null;

const wss = new WebSocketServer({ server, path: '/ws' });

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(result) ? generateRoomId() : result;
}

function broadcastToRoom(room: Room, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const player of room.players) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerId = 'P_' + Math.random().toString(36).substring(2, 8);

  ws.on('message', (rawData: string) => {
    try {
      const data = JSON.parse(rawData.toString());

      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: data.timestamp }));
        return;
      }

      if (data.type === 'QUICK_MATCH') {
        const fighterId = data.fighterId || 'kaelen';
        const playerName = data.name || 'Fighter';
        const session: PlayerSession = {
          ws,
          id: playerId,
          name: playerName,
          fighterId,
          ready: true,
          ping: 15
        };

        if (matchmakingQueue && matchmakingQueue.ws.readyState === WebSocket.OPEN && matchmakingQueue.id !== playerId) {
          const matchedPlayer = matchmakingQueue;
          matchmakingQueue = null;

          const roomId = generateRoomId();
          const newRoom: Room = {
            id: roomId,
            stageId: 'pagoda_courtyard',
            players: [matchedPlayer, session],
            state: 'FIGHTING',
            createdAt: Date.now()
          };
          rooms.set(roomId, newRoom);
          currentRoomId = roomId;

          matchedPlayer.ws.send(JSON.stringify({
            type: 'MATCH_FOUND',
            roomId,
            playerSlot: 1,
            opponent: { name: session.name, fighterId: session.fighterId },
            stageId: newRoom.stageId
          }));

          session.ws.send(JSON.stringify({
            type: 'MATCH_FOUND',
            roomId,
            playerSlot: 2,
            opponent: { name: matchedPlayer.name, fighterId: matchedPlayer.fighterId },
            stageId: newRoom.stageId
          }));
        } else {
          matchmakingQueue = session;
          ws.send(JSON.stringify({ type: 'SEARCHING_MATCH' }));
        }
        return;
      }

      if (data.type === 'CANCEL_MATCHMAKING') {
        if (matchmakingQueue && matchmakingQueue.id === playerId) {
          matchmakingQueue = null;
          ws.send(JSON.stringify({ type: 'MATCHMAKING_CANCELLED' }));
        }
        return;
      }

      if (data.type === 'CREATE_ROOM') {
        const roomId = generateRoomId();
        const stageId = data.stageId || 'pagoda_courtyard';
        const session: PlayerSession = {
          ws,
          id: playerId,
          name: data.name || 'Player 1',
          fighterId: data.fighterId || 'kaelen',
          ready: false,
          ping: 15
        };

        const room: Room = {
          id: roomId,
          stageId,
          players: [session],
          state: 'LOBBY',
          createdAt: Date.now()
        };
        rooms.set(roomId, room);
        currentRoomId = roomId;

        ws.send(JSON.stringify({
          type: 'ROOM_CREATED',
          roomId,
          stageId,
          playerSlot: 1
        }));
        return;
      }

      if (data.type === 'JOIN_ROOM') {
        const roomCode = (data.roomId || '').toUpperCase().trim();
        const room = rooms.get(roomCode);

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found or expired' }));
          return;
        }

        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is already full' }));
          return;
        }

        const session: PlayerSession = {
          ws,
          id: playerId,
          name: data.name || 'Player 2',
          fighterId: data.fighterId || 'ren',
          ready: false,
          ping: 20
        };

        room.players.push(session);
        currentRoomId = roomCode;

        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          roomId: room.id,
          stageId: room.stageId,
          playerSlot: 2,
          opponent: {
            name: room.players[0].name,
            fighterId: room.players[0].fighterId
          }
        }));

        room.players[0].ws.send(JSON.stringify({
          type: 'OPPONENT_JOINED',
          opponent: {
            name: session.name,
            fighterId: session.fighterId
          }
        }));
        return;
      }

      if (data.type === 'SELECT_FIGHTER') {
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          player.fighterId = data.fighterId;
          broadcastToRoom(room, {
            type: 'FIGHTER_SELECTED',
            playerId,
            fighterId: data.fighterId
          }, ws);
        }
        return;
      }

      if (data.type === 'READY_TOGGLE') {
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          player.ready = data.ready;
          broadcastToRoom(room, {
            type: 'PLAYER_READY_STATUS',
            playerId,
            ready: player.ready
          });

          if (room.players.length === 2 && room.players.every(p => p.ready)) {
            room.state = 'FIGHTING';
            broadcastToRoom(room, {
              type: 'START_MATCH_COUNTDOWN',
              stageId: room.stageId
            });
          }
        }
        return;
      }

      // In-game actions relay: inputs, moves, combos, stage destruction
      if (data.type === 'COMBAT_EVENT' || data.type === 'STAGE_DESTROY' || data.type === 'SYNC_STATE' || data.type === 'ROUND_RESULT' || data.type === 'REMATCH_VOTE') {
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;
        broadcastToRoom(room, data, ws);
      }

    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (matchmakingQueue && matchmakingQueue.id === playerId) {
      matchmakingQueue = null;
    }

    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.players.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          broadcastToRoom(room, {
            type: 'OPPONENT_DISCONNECTED'
          });
        }
      }
    }
  });
});

// Rooms health check & info API
app.get('/api/status', (req, res) => {
  res.json({
    onlinePlayers: wss.clients.size,
    activeRooms: rooms.size,
    inQueue: matchmakingQueue !== null
  });
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Fight Genesis server running on http://0.0.0.0:${port}`);
  });
}

startServer();
