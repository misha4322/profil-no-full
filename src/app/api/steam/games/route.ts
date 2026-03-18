import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Кэшируем список игр Steam (обновляем раз в день)
let gamesCache: { appid: number; name: string }[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

async function fetchSteamGames() {
  const now = Date.now();
  
  // Используем кэш если есть
  if (gamesCache && (now - cacheTime) < CACHE_DURATION) {
    return gamesCache;
  }

  const STEAM_API_KEY = process.env.STEAM_SECRET;

  if (!STEAM_API_KEY) {
    console.error("STEAM_SECRET не найден в .env");
    return [];
  }

  try {
    console.log("Загрузка списка игр Steam...");
    
    // Убираем next: { revalidate } так как ответ слишком большой для кэша Next.js
    const res = await fetch(
      `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${STEAM_API_KEY}&include_games=true&include_dlc=false&include_software=false&include_videos=false&include_hardware=false&max_results=50000`,
      { 
        cache: 'no-store', // отключаем кэш Next.js
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SteamApp/1.0'
        }
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Steam API error: ${res.status} ${res.statusText}`, errorText);
      
      // Если IStoreService не работает, пробуем старый API без ключа
      return await fetchSteamGamesLegacy();
    }
    
    const data = await res.json();
    
    // IStoreService возвращает другую структуру данных
    if (data.response && data.response.apps) {
      gamesCache = data.response.apps.map((app: any) => ({
        appid: app.appid,
        name: app.name || "Unknown"
      }));
    } else {
      console.error("Неожиданный формат ответа Steam API:", data);
      return await fetchSteamGamesLegacy();
    }
    
    cacheTime = now;
    console.log(`✅ Загружено ${gamesCache.length} игр из Steam`);
    
    return gamesCache;
  } catch (error) {
    console.error("Ошибка при загрузке игр Steam:", error);
    
    // Если есть старый кэш, возвращаем его
    if (gamesCache && gamesCache.length > 0) {
      console.log("Используем старый кэш игр");
      return gamesCache;
    }
    
    // Иначе пробуем старый API
    return await fetchSteamGamesLegacy();
  }
}

// Резервный метод: старый API без ключа (менее надежный)
async function fetchSteamGamesLegacy() {
  try {
    console.log("Пробуем старый Steam API (ISteamApps/GetAppList/v2)...");
    
    const res = await fetch(
      "https://api.steampowered.com/ISteamApps/GetAppList/v2/",
      { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SteamApp/1.0'
        },
        signal: AbortSignal.timeout(10000) // timeout 10 секунд
      }
    );
    
    if (!res.ok) {
      console.error(`Старый Steam API тоже не работает: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const apps = data.applist?.apps || [];
    
    console.log(`✅ Загружено ${apps.length} игр из старого Steam API`);
    
    return apps;
  } catch (error) {
    console.error("Старый Steam API недоступен:", error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("search")?.toLowerCase().trim() || "";
    
    const allGames = await fetchSteamGames();
    
    // Проверка на null или пустой массив
    if (!allGames || allGames.length === 0) {
      return NextResponse.json({ 
        games: [],
        error: "Не удалось загрузить список игр из Steam. Проверьте STEAM_SECRET в .env"
      });
    }
    
    if (!query) {
      // Возвращаем первые 100 игр если нет поиска
      const topGames = allGames.slice(0, 100);
      return NextResponse.json({ 
        games: topGames.map(g => ({
          appid: g.appid,
          name: g.name,
          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
          capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`
        })),
        total: allGames.length
      });
    }
    
    // Поиск игр по названию
    const filtered = allGames
      .filter(g => g.name && g.name.toLowerCase().includes(query))
      .slice(0, 50) // максимум 50 результатов поиска
      .map(g => ({
        appid: g.appid,
        name: g.name,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`
      }));
    
    return NextResponse.json({ 
      games: filtered,
      total: filtered.length
    });
  } catch (error) {
    console.error("Steam API route error:", error);
    return NextResponse.json({ 
      error: "Ошибка при обработке запроса", 
      games: [] 
    }, { status: 500 });
  }
}
