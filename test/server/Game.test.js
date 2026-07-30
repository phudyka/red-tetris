const Game = require("../../src/server/Game");
const Player = require("../../src/server/Player");

describe("Game Class", () => {
  it("should create an empty game properly", () => {
    const game = new Game("testRoom");
    expect(game.name).toBe("testRoom");
    expect(game.players.length).toBe(0);
    expect(game.pieces.length).toBe(0);
    expect(game.started).toBe(false);
    expect(game.over).toBe(false);
  });

  it("should make the first added player the host", () => {
    const game = new Game("room");
    const p1 = new Player("s1", "P1", "room");
    const p2 = new Player("s2", "P2", "room");

    game.addPlayer(p1);
    game.addPlayer(p2);

    expect(game.players.length).toBe(2);
    expect(p1.isHost).toBe(true);
    expect(p2.isHost).toBe(false); // Not host
  });

  it("should cleanly remove a player and transfer host if needed", () => {
    const game = new Game("r1");
    const p1 = new Player("1", "A", "r1");
    const p2 = new Player("2", "B", "r1");

    game.addPlayer(p1);
    game.addPlayer(p2);

    // Remove host (p1)
    const removed = game.removePlayer("1");
    expect(removed).toBe(p1);
    expect(game.players.length).toBe(1);
    // p2 should become host
    expect(p2.isHost).toBe(true);
  });

  it("should start game correctly and generate pieces for all", () => {
    const game = new Game("startRoom");
    const p = new Player("s", "A", "startRoom");
    game.addPlayer(p);

    // Alter p1 properties to verify reset
    p.isAlive = false;

    game.start();

    expect(game.started).toBe(true);
    // Sacs de 7 complets : la longueur est arrondie au sac supérieur, jamais
    // coupée au milieu — sinon deux segments concaténés casseraient le 7-bag.
    expect(game.pieces.length).toBeGreaterThanOrEqual(500);
    expect(game.pieces.length % 7).toBe(0);
    expect(p.isAlive).toBe(true); // Reset called on player
  });

  it("should serve pieces progressively via getNextPiece", () => {
    const game = new Game("pRoom");
    const p = new Player("1", "X", "pRoom");
    game.addPlayer(p);
    game.start();

    const firstPieceType = game.pieces[0];
    const secondPieceType = game.pieces[1];

    expect(game.getNextPiece(p)).toBe(firstPieceType);
    expect(game.getNextPiece(p)).toBe(secondPieceType);
    expect(p.pieceIndex).toBe(2);
  });

  it("should extend the sequence instead of running out of pieces", () => {
    const game = new Game("longRoom");
    const p1 = new Player("1", "A", "longRoom");
    const p2 = new Player("2", "B", "longRoom");
    game.addPlayer(p1);
    game.addPlayer(p2);
    game.start();

    // Une partie de plus de 500 pièces (~17 min) dépassait le tableau et
    // renvoyait undefined : le client n'avait plus de pièce à faire tomber.
    for (let i = 0; i < 520; i++) {
      expect(game.getNextPiece(p1)).toBeGreaterThanOrEqual(0);
    }
    expect(game.pieces.length).toBeGreaterThan(520);
    // Le serveur lit aussi l'aperçu à l'index suivant : il doit exister.
    expect(game.pieces[p1.pieceIndex]).toBeDefined();

    // L'invariant du sujet tient : à index égal, même pièce pour tous.
    for (let i = 0; i < 520; i++) {
      expect(game.getNextPiece(p2)).toBe(game.pieces[i]);
    }
  });

  it("checkWinCondition should handle solo play correctly", () => {
    const game = new Game("soloRoom");
    const p = new Player("1", "A", "soloRoom");
    game.addPlayer(p);
    game.start();

    expect(game.checkWinCondition()).toBe(null); // Not dead yet

    p.isAlive = false;
    expect(game.checkWinCondition()).toBe(null); // Only player, dead -> no explicit winner
  });

  it("checkWinCondition should handle multiplayer correctly", () => {
    const game = new Game("mRoom");
    const p1 = new Player("1", "A", "mRoom");
    const p2 = new Player("2", "B", "mRoom");
    game.addPlayer(p1);
    game.addPlayer(p2);
    game.start();

    expect(game.checkWinCondition()).toBe(null); // Both alive

    // Un des deux meurt
    p2.isAlive = false;
    expect(game.checkWinCondition()).toBe(p1); // P1 is the last alive

    // Simuler que les deux meurent (cas extreme)
    p1.isAlive = false;
    expect(game.checkWinCondition()).toBe(null); // Tous morts simultanément = pas de gagnant
  });

  it("should prevent removing a player that is not in the game", () => {
    const game = new Game("r2");
    const removed = game.removePlayer("unknown_id");
    expect(removed).toBe(null);
  });

  it("should guarantee sequence generation is identical for all players in room", () => {
    const game = new Game("roomSeq");
    const p1 = new Player("1", "P1", "roomSeq");
    const p2 = new Player("2", "P2", "roomSeq");
    game.addPlayer(p1);
    game.addPlayer(p2);
    game.start();

    // Vérifier que la séquence commune est accédée
    expect(game.getNextPiece(p1)).toBe(game.pieces[0]);
    expect(game.getNextPiece(p2)).toBe(game.pieces[0]);
    expect(game.getNextPiece(p1)).toBe(game.pieces[1]);
    expect(game.getNextPiece(p2)).toBe(game.pieces[1]);
  });
});
