/**
 * @jest-environment node
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  loadLeaderboard,
  saveLeaderboard,
} = require("../../src/server/leaderboardStore");

const tmpFile = (name) => path.join(os.tmpdir(), `red-tetris-${name}.json`);

describe("Persistance du classement", () => {
  const files = [];
  const file = (name) => {
    const f = tmpFile(name);
    files.push(f);
    return f;
  };

  afterAll(() => {
    files.forEach((f) => {
      try {
        fs.unlinkSync(f);
      } catch {
        /* déjà absent */
      }
    });
  });

  it("fait l'aller-retour disque sans perdre le mode", () => {
    const f = file("roundtrip");
    const map = new Map([
      ["Alice", { score: 1500, mode: "INV" }],
      ["Bob", { score: 900, mode: "CLASSIC" }],
    ]);

    expect(saveLeaderboard(map, f)).toBe(true);
    expect(loadLeaderboard(f)).toEqual(map);
  });

  it("démarre à vide quand le fichier n'existe pas", () => {
    expect(loadLeaderboard(tmpFile("jamais-ecrit"))).toEqual(new Map());
  });

  it("démarre à vide sur un JSON illisible plutôt que de faire tomber le serveur", () => {
    const f = file("corrompu");
    fs.writeFileSync(f, "{ ceci n'est pas du JSON");
    expect(loadLeaderboard(f)).toEqual(new Map());
  });

  it("écarte les entrées bancales sans jeter les bonnes", () => {
    const f = file("partiel");
    fs.writeFileSync(
      f,
      JSON.stringify([
        ["Alice", { score: 1000, mode: "SPR" }],
        ["Bob", { score: "beaucoup" }],
        ["Carol", null],
        "pas une entrée",
      ]),
    );

    const loaded = loadLeaderboard(f);
    expect(loaded.size).toBe(1);
    expect(loaded.get("Alice")).toEqual({ score: 1000, mode: "SPR" });
  });

  it("complète un mode manquant par CLASSIC", () => {
    const f = file("sans-mode");
    fs.writeFileSync(f, JSON.stringify([["Alice", { score: 500 }]]));
    expect(loadLeaderboard(f).get("Alice")).toEqual({
      score: 500,
      mode: "CLASSIC",
    });
  });

  it("signale l'échec d'écriture sans lever", () => {
    const map = new Map([["Alice", { score: 1, mode: "CLASSIC" }]]);
    // Un répertoire inexistant : la fin de partie doit continuer quand même.
    expect(saveLeaderboard(map, "/nowhere/red-tetris/lb.json")).toBe(false);
  });
});
