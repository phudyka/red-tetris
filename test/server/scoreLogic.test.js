const {
  applyBackToBack,
  calcScore,
  comboScore,
  dropScore,
  getLeaderboardArray,
  isDifficultClear,
  updateLeaderboard,
} = require("../../src/server/scoreLogic");

describe("Server Score Logic", () => {
  it("should calculate scores correctly", () => {
    expect(calcScore(1)).toBe(100);
    expect(calcScore(2)).toBe(300);
    expect(calcScore(3)).toBe(500);
    expect(calcScore(4)).toBe(800);
    expect(calcScore(0)).toBe(0);
    expect(calcScore(5)).toBe(0);
  });

  it("should update leaderboard only if score is higher", () => {
    const lb = new Map();
    updateLeaderboard(lb, "Alice", 1000);
    expect(lb.get("Alice")).toBe(1000);

    updateLeaderboard(lb, "Alice", 500);
    expect(lb.get("Alice")).toBe(1000); // Unchanged

    updateLeaderboard(lb, "Alice", 1500);
    expect(lb.get("Alice")).toBe(1500); // Updated
  });

  it("should return sorted array limited to 10", () => {
    const lb = new Map();
    for (let i = 1; i <= 15; i++) {
      lb.set(`Player${i}`, i * 100);
    }
    const arr = getLeaderboardArray(lb);
    expect(arr.length).toBe(10);
    expect(arr[0].playerName).toBe("Player15");
    expect(arr[0].score).toBe(1500);
    expect(arr[9].playerName).toBe("Player6");
  });

  describe("niveau, T-spin, combo, back-to-back, descente", () => {
    it("multiplie le score de base par le niveau", () => {
      expect(calcScore(4, 1)).toBe(800);
      expect(calcScore(4, 7)).toBe(5600);
      // Un niveau absent ou nul ne doit pas annuler le score.
      expect(calcScore(1, 0)).toBe(100);
    });

    it("paie un T-spin plus cher, y compris sans ligne", () => {
      expect(calcScore(0, 1, true)).toBe(400);
      expect(calcScore(1, 1, true)).toBe(800);
      expect(calcScore(2, 2, true)).toBe(2400);
      // Sans T-spin, zéro ligne ne rapporte rien.
      expect(calcScore(0, 5, false)).toBe(0);
    });

    it("ne paie le combo qu'à partir du deuxième effacement d'affilée", () => {
      expect(comboScore(-1)).toBe(0);
      expect(comboScore(0)).toBe(0); // premier de la série
      expect(comboScore(1, 1)).toBe(50);
      expect(comboScore(3, 4)).toBe(600);
    });

    it("compte les rangées descendues, double en hard drop", () => {
      expect(dropScore(7)).toBe(7);
      expect(dropScore(7, true)).toBe(14);
      expect(dropScore(0, true)).toBe(0);
      expect(dropScore(-3)).toBe(0);
      expect(dropScore("boom")).toBe(0);
    });

    it("réserve le back-to-back au tetris et au T-spin", () => {
      expect(isDifficultClear(4, false)).toBe(true);
      expect(isDifficultClear(1, true)).toBe(true);
      expect(isDifficultClear(3, false)).toBe(false);
      // Un T-spin sans ligne ne nourrit pas la chaîne.
      expect(isDifficultClear(0, true)).toBe(false);
    });

    it("applique 1,5× quand la chaîne est déjà ouverte", () => {
      expect(applyBackToBack(800, true)).toBe(1200);
      expect(applyBackToBack(800, false)).toBe(800);
    });
  });
});
