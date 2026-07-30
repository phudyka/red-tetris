const {
  isValidLabel,
  clampLinesCleared,
  clampDropCells,
  MAX_LABEL_LENGTH,
} = require("../../src/server/validation");

describe("validation", () => {
  describe("isValidLabel", () => {
    it("accepte un nom ordinaire, accentué ou en emoji", () => {
      expect(isValidLabel("alice")).toBe(true);
      expect(isValidLabel("Amélie")).toBe(true);
      expect(isValidLabel("🐧")).toBe(true);
    });

    it("refuse ce qui n’est pas une chaîne exploitable", () => {
      expect(isValidLabel(undefined)).toBe(false);
      expect(isValidLabel(null)).toBe(false);
      expect(isValidLabel(42)).toBe(false);
      expect(isValidLabel({ toString: () => "bob" })).toBe(false);
      expect(isValidLabel("")).toBe(false);
      expect(isValidLabel("   ")).toBe(false);
    });

    it("refuse au-delà de la longueur maximale", () => {
      expect(isValidLabel("a".repeat(MAX_LABEL_LENGTH))).toBe(true);
      expect(isValidLabel("a".repeat(MAX_LABEL_LENGTH + 1))).toBe(false);
    });
  });

  describe("clampLinesCleared", () => {
    it("laisse passer les valeurs de jeu", () => {
      expect(clampLinesCleared(0)).toBe(0);
      expect(clampLinesCleared(1)).toBe(1);
      expect(clampLinesCleared(4)).toBe(4);
    });

    it("borne ce qui ne peut pas venir d’une partie honnête", () => {
      expect(clampLinesCleared(9999)).toBe(4);
      expect(clampLinesCleared(-5)).toBe(0);
      expect(clampLinesCleared(2.9)).toBe(2);
      expect(clampLinesCleared("3")).toBe(3);
      expect(clampLinesCleared("boom")).toBe(0);
      expect(clampLinesCleared(undefined)).toBe(0);
      // Infinity et NaN ne sont pas « énorme donc 4 » : ils ne sont pas un
      // nombre de lignes du tout, ils ne rapportent rien et ne punissent personne.
      expect(clampLinesCleared(Infinity)).toBe(0);
      expect(clampLinesCleared(NaN)).toBe(0);
    });
  });

  describe("clampDropCells", () => {
    it("laisse passer une descente plausible", () => {
      expect(clampDropCells(0)).toBe(0);
      expect(clampDropCells(19)).toBe(19);
    });

    it("borne à la hauteur du plateau — la distance vaut des points", () => {
      expect(clampDropCells(9999)).toBe(20);
      expect(clampDropCells(-4)).toBe(0);
      expect(clampDropCells("boom")).toBe(0);
      expect(clampDropCells(Infinity)).toBe(0);
      expect(clampDropCells(undefined)).toBe(0);
    });
  });
});
