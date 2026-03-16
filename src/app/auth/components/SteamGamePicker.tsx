"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import "./SteamGamePicker.css";

type SteamGame = {
  appid: number;
  name: string;
  headerImage: string;
  capsuleImage: string;
};

export default function SteamGamePicker({
  onSelect,
  selectedGame,
}: {
  onSelect: (game: SteamGame | null) => void;
  selectedGame: SteamGame | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [games, setGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(false);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/steam/games?search=${encodeURIComponent(query)}`
        : `/api/steam/games`;
      
      const res = await fetch(url);
      const data = await res.json();
      setGames(data.games || []);
    } catch (error) {
      console.error("Error searching games:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      searchGames(search);
    }, 300); // debounce 300ms

    return () => clearTimeout(timer);
  }, [search, isOpen, searchGames]);

  return (
    <div className="steam-picker">
      <label className="text-sm text-gray-300 mb-2 block">
        🎮 Игра из Steam (опционально)
      </label>
      
      {selectedGame ? (
        <div className="selected-game">
          <div className="selected-game-info">
            <Image
              src={selectedGame.capsuleImage}
              alt={selectedGame.name}
              width={184}
              height={69}
              className="selected-game-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="selected-game-name">{selectedGame.name}</div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="btn-remove"
          >
            ✕ Удалить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn-select"
        >
          Выбрать игру из Steam
        </button>
      )}

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Выберите игру</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 Поиск игры..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              autoFocus
            />

            <div className="games-list">
              {loading ? (
                <div className="loading">Загрузка...</div>
              ) : games.length === 0 ? (
                <div className="empty">
                  {search ? "Игры не найдены" : "Начните вводить название"}
                </div>
              ) : (
                games.map((game) => (
                  <button
                    key={game.appid}
                    type="button"
                    onClick={() => {
                      onSelect(game);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className="game-item"
                  >
                    <Image
                      src={game.capsuleImage}
                      alt={game.name}
                      width={92}
                      height={35}
                      className="game-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="game-name">{game.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
