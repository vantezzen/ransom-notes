import { Socket } from "socket.io-client";
import { GamePhase, GameState } from "./gameState";
import debugging from "debug";
const debug = debugging("gameEvent");

export enum GameEventType {
  PlayerJoin = "playerJoin",
  PlayerLeave = "playerLeave",
  SelectCzar = "selectCzar",
  RoundStart = "roundStart",
  StartJudging = "startJudging",
  PlayerCards = "playerCards",
  RoundEnd = "roundEnd",
  GameEnd = "gameEnd",
}

export type GameEvent = {
  type: GameEventType;
  payload: unknown;
};

export function handleEvent(event: GameEvent, state: GameState) {
  switch (event.type) {
    case GameEventType.PlayerJoin:
      debug("Player joined", event.payload);
      state.updateState({
        players: [...state.players, event.payload as string],
      });
      break;
    case GameEventType.PlayerLeave:
      debug("Player left", event.payload);
      state.updateState({
        players: state.players.filter((p) => p !== event.payload),
      });

      if (state.czar === event.payload) {
        debug("Czar left. TODO: Handle this");
        // Problem is we don't have access to the "trigger" function here
        // otherwise we could just call "startNewRound"
      }

      break;
    case GameEventType.SelectCzar:
      debug("Selecting czar", event.payload);
      state.updateState({
        czar: event.payload as string,
        previousCzars: [...state.previousCzars, event.payload as string],
      });
      break;
    case GameEventType.RoundStart:
      debug(
        `Round start as ${state.ownId === state.czar ? "czar" : "player"} (${
          state.czar
        } === ${state.ownId})`
      );
      state.updateState({
        phase:
          state.czar === state.ownId
            ? GamePhase.WaitingForCards
            : GamePhase.SelectingCards,
        playedCards: {},
        prompt: event.payload as string,
      });
      break;
    case GameEventType.StartJudging:
      debug("Start judging");
      state.updateState({
        phase:
          state.czar === state.ownId
            ? GamePhase.Judging
            : GamePhase.WaitingForJudge,
      });
      break;
    case GameEventType.PlayerCards:
      debug("Received cards", event.payload);
      const { id, cards } = event.payload as { id: string; cards: string[] };
      state.updateState({
        playedCards: {
          ...state.playedCards,
          [id]: cards,
        },
      });
      break;
    case GameEventType.RoundEnd:
      debug("Round end", event.payload);

      const { winnerId, playerPoints } = event.payload as {
        winnerId: string;
        playerPoints: Record<string, number>;
      };

      state.updateState({
        phase: GamePhase.Roundup,
        winnerId,
        playerPoints,
      });
      break;

    case GameEventType.GameEnd:
      debug("Game end", event.payload);
      state.updateState({
        phase: GamePhase.GameEnd,
      });
      break;
  }
}

export function sendEvent(socket: Socket, event: GameEvent, gameId: string) {
  socket.emit("gameEvent", event, gameId);
}
