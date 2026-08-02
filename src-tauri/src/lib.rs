use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use percent_encoding::{utf8_percent_encode, AsciiSet, CONTROLS};
use reqwest::blocking::Client;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use thiserror::Error;

type Row = serde_json::Map<String, Value>;
type HmacSha256 = Hmac<Sha256>;
const R2_ENCODE_SET: &AsciiSet = &CONTROLS
    .add(b' ')
    .add(b'"')
    .add(b'#')
    .add(b'%')
    .add(b'<')
    .add(b'>')
    .add(b'?')
    .add(b'`')
    .add(b'{')
    .add(b'}');

#[derive(Debug, Error)]
enum NativeError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
}

impl serde::Serialize for NativeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type NativeResult<T> = Result<T, NativeError>;

struct LibraryDb {
    path: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Deserialize)]
struct NativeSeedSnapshot {
    #[serde(rename = "tvRows")]
    tv_rows: Vec<Row>,
    #[serde(rename = "tvEpisodeRows", default)]
    tv_episode_rows: Vec<Row>,
    #[serde(rename = "bookRows")]
    book_rows: Vec<Row>,
    #[serde(rename = "movieRows")]
    movie_rows: Vec<Row>,
    #[serde(rename = "gameRows")]
    game_rows: Vec<Row>,
    #[serde(rename = "settingsRows")]
    settings_rows: Vec<Row>,
}

#[derive(Debug, Serialize)]
struct NativeSnapshot {
    #[serde(rename = "tvRows")]
    tv_rows: Vec<Row>,
    #[serde(rename = "tvEpisodeRows")]
    tv_episode_rows: Vec<Row>,
    #[serde(rename = "bookRows")]
    book_rows: Vec<Row>,
    #[serde(rename = "movieRows")]
    movie_rows: Vec<Row>,
    #[serde(rename = "gameRows")]
    game_rows: Vec<Row>,
    #[serde(rename = "settingsRows")]
    settings_rows: Vec<Row>,
    #[serde(rename = "lastSyncAt")]
    last_sync_at: Option<i64>,
    #[serde(rename = "pendingCount")]
    pending_count: i64,
}

#[derive(Debug, Deserialize)]
struct NativeSheetWrite {
    url: String,
    payload: Value,
    #[serde(rename = "fallbackMessage")]
    fallback_message: String,
}

#[derive(Debug, Deserialize)]
struct NativeItemWrite {
    #[serde(rename = "mediaType")]
    media_type: String,
    #[serde(rename = "itemKey")]
    item_key: String,
    row: Row,
}

#[derive(Debug, Deserialize)]
struct NativeSettingWrite {
    key: String,
    value: String,
    category: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NativeAssetImport {
    #[serde(rename = "sourcePath")]
    source_path: String,
    #[serde(rename = "mediaType")]
    media_type: Option<String>,
    #[serde(rename = "itemKey")]
    item_key: Option<String>,
    kind: String,
    #[serde(rename = "assetKey")]
    asset_key: String,
}

#[derive(Debug, Deserialize)]
struct NativeAssetBytes {
    bytes: Vec<u8>,
    filename: Option<String>,
    #[serde(rename = "contentType")]
    content_type: Option<String>,
    #[serde(rename = "mediaType")]
    media_type: Option<String>,
    #[serde(rename = "itemKey")]
    item_key: Option<String>,
    title: Option<String>,
    #[serde(rename = "objectKey")]
    object_key: Option<String>,
    kind: String,
    #[serde(rename = "assetKey")]
    asset_key: String,
}

#[derive(Debug, Serialize)]
struct NativeAssetImportResult {
    #[serde(rename = "assetKey")]
    asset_key: String,
    #[serde(rename = "localPath")]
    local_path: String,
    sha256: String,
    #[serde(rename = "remoteUrl")]
    remote_url: Option<String>,
    #[serde(rename = "remoteObjectKey")]
    remote_object_key: Option<String>,
    #[serde(rename = "pendingSync")]
    pending_sync: bool,
}

#[derive(Debug, Clone)]
struct R2Config {
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    public_base_url: String,
}

#[derive(Debug, Serialize)]
struct SyncSummary {
    pushed: i64,
    pulled: i64,
    skipped: i64,
    failed: i64,
    pending: i64,
    #[serde(rename = "syncedIds")]
    synced_ids: Vec<i64>,
}

#[derive(Debug, Serialize)]
struct CacheSummary {
    cached: i64,
    skipped: i64,
    failed: i64,
}

#[derive(Debug, Deserialize)]
struct TwitchTokenResponse {
    access_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IgdbLookupGame {
    id: Option<i64>,
    name: Option<String>,
    slug: Option<String>,
    first_release_date: Option<i64>,
    rating: Option<f64>,
    summary: Option<String>,
    cover: Option<IgdbImage>,
    screenshots: Option<Vec<IgdbImage>>,
    genres: Option<Vec<IgdbNamedValue>>,
    platforms: Option<Vec<IgdbNamedValue>>,
    involved_companies: Option<Vec<IgdbInvolvedCompany>>,
}

#[derive(Debug, Deserialize)]
struct IgdbImage {
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IgdbNamedValue {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IgdbInvolvedCompany {
    company: Option<IgdbNamedValue>,
}

#[derive(Debug, Serialize)]
struct CacheStatus {
    #[serde(rename = "cachedCovers")]
    cached_covers: i64,
    #[serde(rename = "totalCovers")]
    total_covers: i64,
    #[serde(rename = "cachedBackdrops")]
    cached_backdrops: i64,
    #[serde(rename = "totalBackdrops")]
    total_backdrops: i64,
    #[serde(rename = "cachedCastPhotos")]
    cached_cast_photos: i64,
    #[serde(rename = "totalCastPhotos")]
    total_cast_photos: i64,
    #[serde(rename = "cachedAssets")]
    cached_assets: i64,
}

#[derive(Debug, Deserialize)]
struct IconCacheRequest {
    #[serde(rename = "iconType")]
    icon_type: String,
    #[serde(rename = "iconKey")]
    icon_key: String,
    #[serde(rename = "remoteUrl")]
    remote_url: String,
}

#[derive(Debug, Serialize)]
struct IconCacheResult {
    #[serde(rename = "iconType")]
    icon_type: String,
    #[serde(rename = "iconKey")]
    icon_key: String,
    #[serde(rename = "remoteUrl")]
    remote_url: String,
    #[serde(rename = "localPath")]
    local_path: Option<String>,
}

fn app_data_dir(app: &AppHandle) -> NativeResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|err| NativeError::Message(format!("Unable to find app data directory: {err}")))
}

fn db_path(app: &AppHandle, state: &State<LibraryDb>) -> NativeResult<PathBuf> {
    let mut guard = state
        .path
        .lock()
        .map_err(|_| NativeError::Message("Database path lock failed.".to_string()))?;
    if let Some(path) = guard.as_ref() {
        return Ok(path.clone());
    }

    let dir = app_data_dir(app)?;
    fs::create_dir_all(dir.join("media"))?;
    fs::create_dir_all(dir.join("sync-log"))?;
    let path = dir.join("library.sqlite");
    *guard = Some(path.clone());
    Ok(path)
}

fn open_db(app: &AppHandle, state: &State<LibraryDb>) -> NativeResult<Connection> {
    let conn = Connection::open(db_path(app, state)?)?;
    init_db(&conn)?;
    Ok(conn)
}

fn init_db(conn: &Connection) -> NativeResult<()> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS media_items (
          media_type TEXT NOT NULL,
          item_key TEXT NOT NULL,
          row_json TEXT NOT NULL,
          remote_updated_at TEXT,
          local_updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          PRIMARY KEY (media_type, item_key)
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          category TEXT,
          description TEXT,
          remote_updated_at TEXT,
          local_updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced'
        );
        CREATE TABLE IF NOT EXISTS assets (
          asset_key TEXT PRIMARY KEY,
          media_type TEXT,
          item_key TEXT,
          kind TEXT NOT NULL,
          local_path TEXT NOT NULL,
          remote_url TEXT,
          sha256 TEXT,
          remote_updated_at TEXT,
          local_updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          op_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_key TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          client_updated_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          last_error TEXT
        );
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn row_key(media_type: &str, row: &Row) -> String {
    let value_for = |key: &str| -> String {
        row.get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string()
    };

    match media_type {
        "book" => value_for("GoogleBooksVolumeId")
            .or_else_nonempty(value_for("OpenLibraryWorkKey"))
            .or_else_nonempty(value_for("isbn"))
            .or_else_nonempty(value_for("ISBN"))
            .or_else_nonempty(value_for("Title")),
        "tv" | "movie" => value_for("TMDB_ID").or_else_nonempty(value_for("Title")),
        "tvEpisode" => {
            let explicit = value_for("EpisodeKey");
            if !explicit.is_empty() {
                return explicit;
            }
            let show_id = value_for("ShowTMDB_ID").or_else_nonempty(value_for("ShowTitle"));
            let season = value_for("SeasonNumber");
            let episode = value_for("EpisodeNumber");
            if show_id.is_empty() || season.is_empty() || episode.is_empty() {
                value_for("EpisodeTMDB_ID").or_else_nonempty(value_for("EpisodeTitle"))
            } else {
                format!("{show_id}:s{season}:e{episode}")
            }
        }
        "game" => {
            let base = value_for("IGDB_ID").or_else_nonempty(value_for("Title"));
            let platform = value_for("Platform");
            if platform.is_empty() {
                base
            } else {
                format!("{base}:{}", platform.to_ascii_lowercase())
            }
        }
        _ => value_for("Title"),
    }
}

fn as_trimmed_string(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(raw)) => raw.trim().to_string(),
        Some(Value::Number(raw)) => raw.to_string(),
        Some(Value::Bool(raw)) => raw.to_string(),
        _ => String::new(),
    }
}

fn row_remote_updated_at(row: &Row, _fallback: &str) -> String {
    let explicit = as_trimmed_string(row.get("LastModifiedAt"));
    if !explicit.is_empty() {
        return explicit;
    }

    let client = as_trimmed_string(row.get("ClientUpdatedAt"));
    if !client.is_empty() {
        return client;
    }

    String::new()
}

fn timestamp_is_newer(left: &str, right: &str) -> bool {
    let left = left.trim();
    let right = right.trim();
    if left.is_empty() || right.is_empty() {
        return false;
    }

    let parse_timestamp = |value: &str| -> Option<DateTime<Utc>> {
        if let Ok(parsed) = DateTime::parse_from_rfc3339(value) {
            return Some(parsed.with_timezone(&Utc));
        }
        if let Ok(parsed) = DateTime::parse_from_str(value, "%m/%d/%Y %I:%M:%S %p %:z") {
            return Some(parsed.with_timezone(&Utc));
        }
        if let Ok(parsed) = DateTime::parse_from_str(value, "%m/%d/%Y %H:%M:%S %:z") {
            return Some(parsed.with_timezone(&Utc));
        }
        None
    };

    match (parse_timestamp(left), parse_timestamp(right)) {
        (Some(left_time), Some(right_time)) => left_time > right_time,
        // If either timestamp can't be parsed, do not skip the queued write.
        _ => false,
    }
}

fn remote_newer_than_queued(
    conn: &Connection,
    entity_type: &str,
    entity_key: &str,
    client_updated_at: &str,
) -> NativeResult<bool> {
    if entity_type == "setting" {
        let remote_updated_at = conn
            .query_row(
                "SELECT remote_updated_at FROM settings WHERE key = ?1",
                [entity_key],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()?
            .flatten()
            .unwrap_or_default();
        return Ok(timestamp_is_newer(&remote_updated_at, client_updated_at));
    }

    if entity_type == "asset" {
        return Ok(false);
    }

    let remote_updated_at = conn
        .query_row(
            "SELECT remote_updated_at FROM media_items WHERE media_type = ?1 AND item_key = ?2",
            params![entity_type, entity_key],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten()
        .unwrap_or_default();
    Ok(timestamp_is_newer(&remote_updated_at, client_updated_at))
}

fn mark_entity_synced(conn: &Connection, entity_type: &str, entity_key: &str) -> NativeResult<()> {
    if entity_type == "setting" {
        conn.execute(
            "UPDATE settings SET sync_status = 'synced' WHERE key = ?1",
            [entity_key],
        )?;
    } else if entity_type == "asset" {
        conn.execute(
            "UPDATE assets SET sync_status = 'synced' WHERE asset_key = ?1",
            [entity_key],
        )?;
    } else {
        conn.execute(
            "UPDATE media_items SET sync_status = 'synced' WHERE media_type = ?1 AND item_key = ?2",
            params![entity_type, entity_key],
        )?;
    }

    Ok(())
}

fn apply_game_status_flags(body: &mut Value) {
    let Value::Object(body_obj) = body else {
        return;
    };

    let action = as_trimmed_string(body_obj.get("action"));
    if action != "updateGame" && action != "addGame" {
        return;
    }

    let fields_key = if body_obj.get("updates").is_some() {
        "updates"
    } else if body_obj.get("values").is_some() {
        "values"
    } else {
        return;
    };

    let Some(Value::Object(fields)) = body_obj.get_mut(fields_key) else {
        return;
    };

    let status = as_trimmed_string(fields.get("Status"));
    let normalized = status.to_lowercase();
    if normalized.is_empty() {
        return;
    }

    if normalized == "queued" || normalized == "replay" || normalized == "backlog" {
        fields.insert("Backlog".to_string(), Value::String("Yes".to_string()));
        fields.insert("Completed".to_string(), Value::String("No".to_string()));
    } else if normalized == "completed" {
        fields.insert("Backlog".to_string(), Value::String("No".to_string()));
        fields.insert("Completed".to_string(), Value::String("Yes".to_string()));
    } else {
        fields.insert("Backlog".to_string(), Value::String("No".to_string()));
        fields.insert("Completed".to_string(), Value::String("No".to_string()));
    }
}

fn read_env_file_value(key: &str) -> Option<String> {
    let mut dirs = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        dirs.push(cwd);
    }
    if let Some(manifest_dir) = option_env!("CARGO_MANIFEST_DIR") {
        dirs.push(PathBuf::from(manifest_dir));
    }

    for dir in dirs {
        for ancestor in dir.ancestors() {
            let candidate = ancestor.join(".env.local");
            let Ok(contents) = fs::read_to_string(candidate) else {
                continue;
            };
            for line in contents.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('#') || trimmed.is_empty() {
                    continue;
                }
                let Some((raw_key, raw_value)) = trimmed.split_once('=') else {
                    continue;
                };
                if raw_key.trim() != key {
                    continue;
                }
                return Some(
                    raw_value
                        .trim()
                        .trim_matches('"')
                        .trim_matches('\'')
                        .to_string(),
                );
            }
        }
    }

    None
}

fn tmdb_credential() -> NativeResult<(Option<String>, Option<String>)> {
    let bearer = std::env::var("TMDB_BEARER_TOKEN")
        .ok()
        .or_else(|| std::env::var("TMDB_API_READ_ACCESS_TOKEN").ok())
        .or_else(|| read_env_file_value("TMDB_BEARER_TOKEN"))
        .or_else(|| read_env_file_value("TMDB_API_READ_ACCESS_TOKEN"))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let api_key = std::env::var("TMDB_API_KEY")
        .ok()
        .or_else(|| read_env_file_value("TMDB_API_KEY"))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    if bearer.is_none() && api_key.is_none() {
        return Err(NativeError::Message(
            "TMDB credentials are not configured.".to_string(),
        ));
    }
    Ok((bearer, api_key))
}

fn tmdb_get_json(client: &Client, path: &str) -> NativeResult<Value> {
    let (bearer, api_key) = tmdb_credential()?;
    let separator = if path.contains('?') { "&" } else { "?" };
    let url = if bearer.is_some() {
        format!("https://api.themoviedb.org/3{path}{separator}language=en-US")
    } else {
        format!(
            "https://api.themoviedb.org/3{path}{separator}language=en-US&api_key={}",
            api_key.unwrap_or_default()
        )
    };
    let mut req = client.get(url);
    if let Some(token) = bearer {
        req = req.bearer_auth(token);
    }
    let res = req.send()?;
    let status = res.status();
    let json: Value = res.json().unwrap_or(Value::Null);
    if !status.is_success() {
        let message = as_trimmed_string(json.get("status_message"));
        return Err(NativeError::Message(if message.is_empty() {
            format!("TMDB request failed: HTTP {status}")
        } else {
            message
        }));
    }
    Ok(json)
}

fn tmdb_image_url(base: &str, path: Option<&Value>) -> String {
    let value = as_trimmed_string(path);
    if value.is_empty() {
        String::new()
    } else if value.starts_with("http://") || value.starts_with("https://") {
        value
    } else if value.starts_with('/') {
        format!("{base}{value}")
    } else {
        format!("{base}/{value}")
    }
}

#[tauri::command]
fn load_tv_episodes(tmdb_id: String, title: Option<String>) -> NativeResult<Vec<Row>> {
    let tmdb_id = tmdb_id.trim().to_string();
    if tmdb_id.is_empty() {
        return Err(NativeError::Message("tmdbId is required.".to_string()));
    }
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;
    let details = tmdb_get_json(&client, &format!("/tv/{}", tmdb_id))?;
    let show_title = as_trimmed_string(details.get("name"))
        .or_else_nonempty(title.unwrap_or_default().trim().to_string());
    let seasons = details
        .get("seasons")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut season_numbers: Vec<i64> = seasons
        .iter()
        .filter_map(|season| season.get("season_number").and_then(Value::as_i64))
        .filter(|season| *season > 0)
        .collect();
    season_numbers.sort_unstable();

    let mut rows = Vec::new();
    for season_number in season_numbers {
        let season_json = tmdb_get_json(
            &client,
            &format!("/tv/{}/season/{}", tmdb_id, season_number),
        )?;
        let season_title = as_trimmed_string(season_json.get("name"))
            .or_else_nonempty(format!("Season {season_number}"));
        let season_poster_url = tmdb_image_url(
            "https://image.tmdb.org/t/p/w500",
            season_json.get("poster_path"),
        );
        let episodes = season_json
            .get("episodes")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        for episode in episodes {
            let episode_number = episode
                .get("episode_number")
                .and_then(Value::as_i64)
                .unwrap_or_default();
            if episode_number <= 0 {
                continue;
            }
            let mut row = Row::new();
            row.insert(
                "EpisodeKey".to_string(),
                Value::String(format!("{tmdb_id}:s{season_number}:e{episode_number}")),
            );
            row.insert("ShowTMDB_ID".to_string(), Value::String(tmdb_id.clone()));
            row.insert("ShowTitle".to_string(), Value::String(show_title.clone()));
            row.insert(
                "SeasonNumber".to_string(),
                Value::String(season_number.to_string()),
            );
            row.insert("SeasonTitle".to_string(), Value::String(season_title.clone()));
            row.insert(
                "SeasonPosterURL".to_string(),
                Value::String(season_poster_url.clone()),
            );
            row.insert(
                "EpisodeNumber".to_string(),
                Value::String(episode_number.to_string()),
            );
            row.insert(
                "EpisodeTMDB_ID".to_string(),
                Value::String(as_trimmed_string(episode.get("id"))),
            );
            row.insert(
                "EpisodeTitle".to_string(),
                Value::String(
                    as_trimmed_string(episode.get("name"))
                        .or_else_nonempty(format!("Episode {episode_number}")),
                ),
            );
            row.insert(
                "AirDate".to_string(),
                Value::String(as_trimmed_string(episode.get("air_date"))),
            );
            row.insert(
                "StillURL".to_string(),
                Value::String(tmdb_image_url(
                    "https://image.tmdb.org/t/p/w780",
                    episode.get("still_path"),
                )),
            );
            row.insert(
                "Overview".to_string(),
                Value::String(as_trimmed_string(episode.get("overview"))),
            );
            row.insert(
                "Runtime".to_string(),
                Value::String(as_trimmed_string(episode.get("runtime"))),
            );
            row.insert("Watched".to_string(), Value::String(String::new()));
            row.insert("WatchedAt".to_string(), Value::String(String::new()));
            row.insert("UpdatedAt".to_string(), Value::String(Utc::now().to_rfc3339()));
            row.insert("Source".to_string(), Value::String("TMDB".to_string()));
            rows.push(row);
        }
    }
    Ok(rows)
}

fn config_value(key: &str) -> Option<String> {
    std::env::var(key).ok().or_else(|| read_env_file_value(key))
}

fn r2_config() -> NativeResult<R2Config> {
    let required = |key: &str| {
        config_value(key)
            .ok_or_else(|| NativeError::Message(format!("Missing {key} for native R2 sync.")))
    };
    Ok(R2Config {
        account_id: required("R2_ACCOUNT_ID")?,
        access_key_id: required("R2_ACCESS_KEY_ID")?,
        secret_access_key: required("R2_SECRET_ACCESS_KEY")?,
        bucket: required("R2_BUCKET_NAME")?,
        public_base_url: required("R2_PUBLIC_URL")?,
    })
}

fn igdb_config() -> NativeResult<(String, String)> {
    let client_id = config_value("IGDB_CLIENT_ID")
        .or_else(|| config_value("TWITCH_CLIENT_ID"))
        .ok_or_else(|| {
            NativeError::Message("Missing IGDB_CLIENT_ID/TWITCH_CLIENT_ID.".to_string())
        })?;
    let client_secret = config_value("IGDB_CLIENT_SECRET")
        .or_else(|| config_value("TWITCH_CLIENT_SECRET"))
        .ok_or_else(|| {
            NativeError::Message("Missing IGDB_CLIENT_SECRET/TWITCH_CLIENT_SECRET.".to_string())
        })?;
    Ok((client_id, client_secret))
}

fn igdb_access_token(
    client: &Client,
    client_id: &str,
    client_secret: &str,
) -> NativeResult<String> {
    let response = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("grant_type", "client_credentials"),
        ])
        .send()?;
    if !response.status().is_success() {
        return Err(NativeError::Message(format!(
            "IGDB auth failed: HTTP {}",
            response.status()
        )));
    }
    let payload = response.json::<TwitchTokenResponse>()?;
    payload
        .access_token
        .filter(|token| !token.trim().is_empty())
        .ok_or_else(|| NativeError::Message("IGDB auth returned no token.".to_string()))
}

fn sanitize_part(value: &str) -> String {
    let mut output = String::new();
    let mut last_dash = false;
    for ch in value.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' {
            output.push(ch);
            last_dash = false;
        } else if !last_dash {
            output.push('-');
            last_dash = true;
        }
    }
    output.trim_matches('-').chars().take(80).collect()
}

fn sanitize_object_key(value: &str) -> String {
    value
        .split('/')
        .map(sanitize_part)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("/")
}

fn build_remote_object_key(asset: &NativeAssetBytes, ext: &str) -> String {
    let requested = asset.object_key.as_deref().unwrap_or_default();
    let sanitized_requested = sanitize_object_key(requested);
    if !sanitized_requested.is_empty() {
        return sanitized_requested;
    }
    let safe_type = sanitize_part(asset.media_type.as_deref().unwrap_or("media"));
    let safe_key = sanitize_part(
        asset
            .item_key
            .as_deref()
            .or(asset.title.as_deref())
            .unwrap_or("cover"),
    );
    format!(
        "overrides/{}/{}-{}.{}",
        if safe_type.is_empty() {
            "media"
        } else {
            &safe_type
        },
        if safe_key.is_empty() {
            "cover"
        } else {
            &safe_key
        },
        Utc::now().timestamp_millis(),
        ext
    )
}

fn public_r2_url(config: &R2Config, object_key: &str) -> String {
    format!(
        "{}/{}",
        config.public_base_url.trim_end_matches('/'),
        object_key
    )
}

fn canonical_uri(bucket: &str, object_key: &str) -> String {
    let encoded_key = object_key
        .split('/')
        .map(|segment| utf8_percent_encode(segment, R2_ENCODE_SET).to_string())
        .collect::<Vec<_>>()
        .join("/");
    format!("/{bucket}/{encoded_key}")
}

fn hmac_sha256(key: &[u8], data: &str) -> NativeResult<Vec<u8>> {
    let mut mac = HmacSha256::new_from_slice(key)
        .map_err(|err| NativeError::Message(format!("Failed to create HMAC: {err}")))?;
    mac.update(data.as_bytes());
    Ok(mac.finalize().into_bytes().to_vec())
}

fn r2_signing_key(secret: &str, date: &str) -> NativeResult<Vec<u8>> {
    let k_date = hmac_sha256(format!("AWS4{secret}").as_bytes(), date)?;
    let k_region = hmac_sha256(&k_date, "auto")?;
    let k_service = hmac_sha256(&k_region, "s3")?;
    hmac_sha256(&k_service, "aws4_request")
}

fn upload_file_to_r2(
    config: &R2Config,
    object_key: &str,
    local_path: &str,
    content_type: &str,
) -> NativeResult<String> {
    let bytes = fs::read(local_path)?;
    upload_bytes_to_r2(config, object_key, bytes, content_type)
}

fn upload_bytes_to_r2(
    config: &R2Config,
    object_key: &str,
    bytes: Vec<u8>,
    content_type: &str,
) -> NativeResult<String> {
    let payload_hash = hex::encode(Sha256::digest(&bytes));
    let now = Utc::now();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_scope = now.format("%Y%m%d").to_string();
    let host = format!("{}.r2.cloudflarestorage.com", config.account_id);
    let cache_control = if object_key.contains('.') {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=60, must-revalidate"
    };
    let uri = canonical_uri(&config.bucket, object_key);
    let canonical_headers = format!(
        "cache-control:{cache_control}\ncontent-type:{content_type}\nhost:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    );
    let signed_headers = "cache-control;content-type;host;x-amz-content-sha256;x-amz-date";
    let canonical_request =
        format!("PUT\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}");
    let credential_scope = format!("{date_scope}/auto/s3/aws4_request");
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n{}",
        hex::encode(Sha256::digest(canonical_request.as_bytes()))
    );
    let signing_key = r2_signing_key(&config.secret_access_key, &date_scope)?;
    let signature = hex::encode(hmac_sha256(&signing_key, &string_to_sign)?);
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        config.access_key_id, credential_scope, signed_headers, signature
    );
    let endpoint = format!("https://{host}{uri}");
    let res = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()?
        .put(endpoint)
        .header("cache-control", cache_control)
        .header("content-type", content_type)
        .header("host", host)
        .header("x-amz-content-sha256", payload_hash)
        .header("x-amz-date", amz_date)
        .header("authorization", authorization)
        .body(bytes)
        .send()?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().unwrap_or_default();
        return Err(NativeError::Message(format!(
            "R2 upload failed: HTTP {status} {text}"
        )));
    }
    Ok(public_r2_url(config, object_key))
}

fn media_type_for_action(action: &str) -> &'static str {
    if action == "upsertTvEpisodeRows"
        || action == "updateTvEpisodeProgress"
        || action == "updateTvEpisodeProgressBulk"
    {
        "tvEpisode"
    } else if action.contains("Book") {
        "book"
    } else if action.contains("Show") {
        "tv"
    } else if action.contains("Movie") {
        "movie"
    } else if action.contains("Game") {
        "game"
    } else {
        "setting"
    }
}

fn matches_sheet_match(media_type: &str, row: &Row, match_value: Option<&Value>) -> bool {
    let Some(Value::Object(match_obj)) = match_value else {
        return false;
    };

    let row_value = |keys: &[&str]| -> String {
        for key in keys {
            let value = as_trimmed_string(row.get(*key));
            if !value.is_empty() {
                return value;
            }
        }
        String::new()
    };
    let match_field = |key: &str| -> String { as_trimmed_string(match_obj.get(key)) };

    let title_match = {
        let lhs = row_value(&["Title", "title"]);
        let rhs = match_field("title");
        !lhs.is_empty() && !rhs.is_empty() && lhs.eq_ignore_ascii_case(&rhs)
    };

    match media_type {
        "book" => {
            let google_id = row_value(&["GoogleBooksVolumeId", "googleBooksVolumeId"]);
            let open_library = row_value(&["OpenLibraryWorkKey", "openLibraryWorkKey"]);
            let isbn = row_value(&["isbn", "ISBN"]);
            (!google_id.is_empty() && google_id == match_field("googleBooksVolumeId"))
                || (!open_library.is_empty() && open_library == match_field("openLibraryWorkKey"))
                || (!isbn.is_empty() && isbn == match_field("isbn"))
                || title_match
        }
        "tv" | "movie" => {
            let tmdb_id = row_value(&["TMDB_ID", "tmdbId"]);
            (!tmdb_id.is_empty() && tmdb_id == match_field("tmdbId")) || title_match
        }
        "tvEpisode" => {
            let row_key = row_value(&["EpisodeKey", "episodeKey"]);
            let match_key = match_field("episodeKey");
            let row_show_id = row_value(&["ShowTMDB_ID", "showTmdbId"]);
            let row_season = row_value(&["SeasonNumber", "seasonNumber"]);
            let row_episode = row_value(&["EpisodeNumber", "episodeNumber"]);
            (!row_key.is_empty() && row_key == match_key)
                || (
                    !row_show_id.is_empty()
                        && row_show_id == match_field("showTmdbId")
                        && row_season == match_field("seasonNumber")
                        && row_episode == match_field("episodeNumber")
                )
        }
        "game" => {
            let igdb_id = row_value(&["IGDB_ID", "igdbId"]);
            let row_platform = row_value(&["Platform", "Platforms"]);
            let match_platform = match_field("platform");
            let platform_match = match_platform.is_empty()
                || row_platform.eq_ignore_ascii_case(&match_platform);
            platform_match
                && ((!igdb_id.is_empty() && igdb_id == match_field("igdbId")) || title_match)
        }
        _ => title_match,
    }
}

fn find_matching_item(
    conn: &Connection,
    media_type: &str,
    match_value: Option<&Value>,
) -> NativeResult<Option<(String, Row)>> {
    let mut stmt = conn.prepare(
        "SELECT item_key, row_json FROM media_items WHERE media_type = ?1 AND deleted_at IS NULL ORDER BY rowid ASC",
    )?;
    let rows = stmt
        .query_map([media_type], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    for (item_key, row_json) in rows {
        let row = serde_json::from_str::<Row>(&row_json)?;
        if matches_sheet_match(media_type, &row, match_value) {
            return Ok(Some((item_key, row)));
        }
    }

    Ok(None)
}

fn merge_updates(row: &mut Row, updates: Option<&Value>) {
    if let Some(Value::Object(updates)) = updates {
        for (key, value) in updates {
            row.insert(key.clone(), Value::String(as_trimmed_string(Some(value))));
        }
    }
}

fn persist_sheet_write_locally(
    conn: &Connection,
    action: &str,
    payload: &Value,
    now: &str,
) -> NativeResult<String> {
    if action == "setting" {
        let key = as_trimmed_string(payload.get("key"));
        if key.is_empty() {
            return Ok(action.to_string());
        }
        let value = as_trimmed_string(payload.get("value"));
        let category = as_trimmed_string(payload.get("category"));
        let description = as_trimmed_string(payload.get("description"));
        conn.execute(
            "INSERT INTO settings (key, value, category, description, local_updated_at, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pending')
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               category = excluded.category,
               description = excluded.description,
               local_updated_at = excluded.local_updated_at,
               sync_status = 'pending'",
            params![&key, &value, &category, &description, now],
        )?;
        return Ok(key);
    }

    let media_type = media_type_for_action(action);
    if media_type == "setting" {
        return Ok(action.to_string());
    }

    if action.starts_with("add") {
        if let Some(Value::Object(values)) =
            payload.get("values").or_else(|| payload.get("updates"))
        {
            let row = values.clone();
            let item_key = row_key(media_type, &row);
            if !item_key.is_empty() {
                conn.execute(
                    "INSERT INTO media_items (media_type, item_key, row_json, local_updated_at, sync_status)
                     VALUES (?1, ?2, ?3, ?4, 'pending')
                     ON CONFLICT(media_type, item_key) DO UPDATE SET
                       row_json = excluded.row_json,
                       local_updated_at = excluded.local_updated_at,
                       deleted_at = NULL,
                       sync_status = 'pending'",
                    params![media_type, &item_key, serde_json::to_string(&row)?, now],
                )?;
                return Ok(item_key);
            }
        }
    }

    if action == "upsertTvEpisodeRows" {
        if let Some(Value::Array(rows)) = payload.get("rows") {
            let mut first_key = String::new();
            for value in rows {
                let Some(row_obj) = value.as_object() else {
                    continue;
                };
                let row = row_obj.clone();
                let item_key = row_key("tvEpisode", &row);
                if item_key.is_empty() {
                    continue;
                }
                if first_key.is_empty() {
                    first_key = item_key.clone();
                }
                conn.execute(
                    "INSERT INTO media_items (media_type, item_key, row_json, local_updated_at, sync_status)
                     VALUES ('tvEpisode', ?1, ?2, ?3, 'pending')
                     ON CONFLICT(media_type, item_key) DO UPDATE SET
                       row_json = excluded.row_json,
                       local_updated_at = excluded.local_updated_at,
                       deleted_at = NULL,
                       sync_status = 'pending'",
                    params![&item_key, serde_json::to_string(&row)?, now],
                )?;
            }
            return Ok(if first_key.is_empty() {
                action.to_string()
            } else {
                first_key
            });
        }
    }

    if action == "updateTvEpisodeProgress" {
        if let Some((item_key, mut row)) =
            find_matching_item(conn, "tvEpisode", payload.get("match"))?
        {
            merge_updates(&mut row, payload.get("updates"));
            conn.execute(
                "UPDATE media_items
                 SET row_json = ?2, local_updated_at = ?3, deleted_at = NULL, sync_status = 'pending'
                 WHERE media_type = 'tvEpisode' AND item_key = ?1",
                params![&item_key, serde_json::to_string(&row)?, now],
            )?;
            return Ok(item_key);
        }
    }

    if action == "updateTvEpisodeProgressBulk" {
        let Some(Value::Array(episodes)) = payload.get("episodes") else {
            return Ok(action.to_string());
        };
        let mut first_key = String::new();
        for episode in episodes {
            let Some(episode_obj) = episode.as_object() else {
                continue;
            };
            let match_value = Value::Object(episode_obj.clone());
            if let Some((item_key, mut row)) =
                find_matching_item(conn, "tvEpisode", Some(&match_value))?
            {
                merge_updates(&mut row, payload.get("updates"));
                conn.execute(
                    "UPDATE media_items
                     SET row_json = ?2, local_updated_at = ?3, deleted_at = NULL, sync_status = 'pending'
                     WHERE media_type = 'tvEpisode' AND item_key = ?1",
                    params![&item_key, serde_json::to_string(&row)?, now],
                )?;
                if first_key.is_empty() {
                    first_key = item_key;
                }
            }
        }
        return Ok(if first_key.is_empty() {
            action.to_string()
        } else {
            first_key
        });
    }

    if action.starts_with("update") {
        if let Some((item_key, mut row)) =
            find_matching_item(conn, media_type, payload.get("match"))?
        {
            merge_updates(&mut row, payload.get("updates"));
            conn.execute(
                "UPDATE media_items
                 SET row_json = ?3, local_updated_at = ?4, deleted_at = NULL, sync_status = 'pending'
                 WHERE media_type = ?1 AND item_key = ?2",
                params![media_type, &item_key, serde_json::to_string(&row)?, now],
            )?;
            return Ok(item_key);
        }
    }

    if action.starts_with("delete") {
        if let Some((item_key, _row)) = find_matching_item(conn, media_type, payload.get("match"))?
        {
            conn.execute(
                "UPDATE media_items
                 SET deleted_at = ?3, local_updated_at = ?3, sync_status = 'pending'
                 WHERE media_type = ?1 AND item_key = ?2",
                params![media_type, &item_key, now],
            )?;
            return Ok(item_key);
        }
    }

    Ok(action.to_string())
}

fn queue_local_change(
    conn: &Connection,
    op_type: &str,
    entity_type: &str,
    entity_key: &str,
    payload: Value,
    now: &str,
) -> NativeResult<i64> {
    conn.execute(
        "INSERT INTO sync_queue (op_type, entity_type, entity_key, payload_json, client_updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            op_type,
            entity_type,
            entity_key,
            serde_json::to_string(&payload)?,
            now
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

trait NonEmptyFallback {
    fn or_else_nonempty(self, fallback: String) -> String;
}

impl NonEmptyFallback for String {
    fn or_else_nonempty(self, fallback: String) -> String {
        if self.trim().is_empty() {
            fallback
        } else {
            self
        }
    }
}

fn load_cached_asset_map(
    conn: &Connection,
    media_type: &str,
) -> NativeResult<HashMap<String, HashMap<String, Vec<String>>>> {
    let mut stmt = conn.prepare(
        "SELECT item_key, kind, local_path FROM assets
         WHERE media_type = ?1 AND local_path <> ''
         ORDER BY CASE WHEN asset_key LIKE 'cache/%' THEN 1 ELSE 0 END ASC, asset_key ASC, local_updated_at DESC",
    )?;
    let rows = stmt
        .query_map([media_type], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut asset_map: HashMap<String, HashMap<String, Vec<String>>> = HashMap::new();
    for (item_key, kind, path) in rows {
        if path.trim().is_empty() || !Path::new(&path).exists() {
            continue;
        }
        asset_map
            .entry(item_key)
            .or_default()
            .entry(kind)
            .or_default()
            .push(path);
    }
    Ok(asset_map)
}

fn load_rows(conn: &Connection, media_type: &str) -> NativeResult<Vec<Row>> {
    let cached_assets = load_cached_asset_map(conn, media_type)?;
    let mut stmt = conn.prepare(
        "SELECT item_key, row_json FROM media_items WHERE media_type = ?1 AND deleted_at IS NULL ORDER BY rowid ASC",
    )?;
    let rows = stmt
        .query_map([media_type], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    rows.into_iter()
        .map(|(item_key, json)| {
            let mut row = serde_json::from_str::<Row>(&json)?;
            let item_assets = cached_assets.get(&item_key);
            if let Some(path) = item_assets
                .and_then(|by_kind| by_kind.get("cover"))
                .and_then(|paths| paths.first())
            {
                row.insert("NativeCoverPath".to_string(), Value::String(path.clone()));
            }
            if let Some(path) = item_assets
                .and_then(|by_kind| by_kind.get("backdrop"))
                .and_then(|paths| paths.first())
            {
                row.insert(
                    "NativeBackdropPath".to_string(),
                    Value::String(path.clone()),
                );
            }
            if let Some(cast_paths) = item_assets.and_then(|by_kind| by_kind.get("cast")) {
                row.insert(
                    "NativeTopcastPhotoPaths".to_string(),
                    Value::String(cast_paths.join(",")),
                );
            }
            Ok(row)
        })
        .collect()
}

fn load_settings(conn: &Connection) -> NativeResult<Vec<Row>> {
    let mut stmt =
        conn.prepare("SELECT key, value, category, description FROM settings ORDER BY key ASC")?;
    let rows = stmt
        .query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            let category: Option<String> = row.get(2)?;
            let description: Option<String> = row.get(3)?;
            let mut item = Row::new();
            item.insert("Key".to_string(), Value::String(key));
            item.insert("Value".to_string(), Value::String(value));
            item.insert(
                "Category".to_string(),
                Value::String(category.unwrap_or_default()),
            );
            item.insert(
                "Description".to_string(),
                Value::String(description.unwrap_or_default()),
            );
            Ok(item)
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
fn read_snapshot(app: AppHandle, state: State<LibraryDb>) -> NativeResult<NativeSnapshot> {
    let conn = open_db(&app, &state)?;
    let last_sync_at = conn
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'last_sync_at'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .and_then(|value| value.parse::<i64>().ok());
    let pending_count = conn.query_row(
        "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'",
        [],
        |row| row.get::<_, i64>(0),
    )?;

    Ok(NativeSnapshot {
        tv_rows: load_rows(&conn, "tv")?,
        tv_episode_rows: load_rows(&conn, "tvEpisode")?,
        book_rows: load_rows(&conn, "book")?,
        movie_rows: load_rows(&conn, "movie")?,
        game_rows: load_rows(&conn, "game")?,
        settings_rows: load_settings(&conn)?,
        last_sync_at,
        pending_count,
    })
}

#[tauri::command]
fn seed_snapshot(
    app: AppHandle,
    state: State<LibraryDb>,
    snapshot: NativeSeedSnapshot,
) -> NativeResult<()> {
    let mut conn = open_db(&app, &state)?;
    let tx = conn.transaction()?;
    let now = Utc::now().to_rfc3339();

    for (media_type, rows) in [
        ("tv", snapshot.tv_rows),
        ("tvEpisode", snapshot.tv_episode_rows),
        ("book", snapshot.book_rows),
        ("movie", snapshot.movie_rows),
        ("game", snapshot.game_rows),
    ] {
        tx.execute(
            "DELETE FROM media_items WHERE media_type = ?1 AND sync_status != 'pending'",
            [media_type],
        )?;
        for row in rows {
            let item_key = row_key(media_type, &row);
            if item_key.is_empty() {
                continue;
            }
            let remote_updated_at = row_remote_updated_at(&row, &now);
            tx.execute(
                "INSERT INTO media_items (media_type, item_key, row_json, remote_updated_at, local_updated_at, sync_status)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'synced')
                 ON CONFLICT(media_type, item_key) DO UPDATE SET
                   row_json = CASE WHEN media_items.sync_status = 'pending' THEN media_items.row_json ELSE excluded.row_json END,
                   remote_updated_at = excluded.remote_updated_at,
                   local_updated_at = CASE WHEN media_items.sync_status = 'pending' THEN media_items.local_updated_at ELSE excluded.local_updated_at END,
                   deleted_at = CASE WHEN media_items.sync_status = 'pending' THEN media_items.deleted_at ELSE NULL END,
                   sync_status = CASE WHEN media_items.sync_status = 'pending' THEN media_items.sync_status ELSE 'synced' END",
                params![
                    media_type,
                    item_key,
                    serde_json::to_string(&row)?,
                    remote_updated_at,
                    now
                ],
            )?;
        }
    }

    for row in snapshot.settings_rows {
        let key = row
            .get("Key")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string();
        if key.is_empty() {
            continue;
        }
        let value = row.get("Value").and_then(Value::as_str).unwrap_or_default();
        let category = row
            .get("Category")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let description = row
            .get("Description")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let remote_updated_at = row_remote_updated_at(&row, &now);
        tx.execute(
            "INSERT INTO settings (key, value, category, description, remote_updated_at, local_updated_at, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'synced')
             ON CONFLICT(key) DO UPDATE SET
               value = CASE WHEN settings.sync_status = 'pending' THEN settings.value ELSE excluded.value END,
               category = CASE WHEN settings.sync_status = 'pending' THEN settings.category ELSE excluded.category END,
               description = CASE WHEN settings.sync_status = 'pending' THEN settings.description ELSE excluded.description END,
               remote_updated_at = excluded.remote_updated_at,
               local_updated_at = CASE WHEN settings.sync_status = 'pending' THEN settings.local_updated_at ELSE excluded.local_updated_at END,
               sync_status = CASE WHEN settings.sync_status = 'pending' THEN settings.sync_status ELSE 'synced' END",
            params![key, value, category, description, remote_updated_at, now],
        )?;
    }

    tx.execute(
        "INSERT INTO app_meta (key, value) VALUES ('last_sync_at', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [Utc::now().timestamp_millis().to_string()],
    )?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
fn queue_sheet_write(
    app: AppHandle,
    state: State<LibraryDb>,
    write: NativeSheetWrite,
) -> NativeResult<i64> {
    let conn = open_db(&app, &state)?;
    let now = Utc::now().to_rfc3339();
    let action = write
        .payload
        .get("action")
        .and_then(Value::as_str)
        .unwrap_or("setting");
    let entity_type = media_type_for_action(action);
    let entity_key = persist_sheet_write_locally(&conn, action, &write.payload, &now)?;
    let payload = serde_json::json!({
        "url": write.url,
        "payload": write.payload,
        "fallbackMessage": write.fallback_message,
        "clientUpdatedAt": now,
    });

    queue_local_change(&conn, action, entity_type, &entity_key, payload, &now)
}

#[tauri::command]
fn save_item(app: AppHandle, state: State<LibraryDb>, write: NativeItemWrite) -> NativeResult<()> {
    let conn = open_db(&app, &state)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO media_items (media_type, item_key, row_json, local_updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, 'pending')
         ON CONFLICT(media_type, item_key) DO UPDATE SET
           row_json = excluded.row_json,
           local_updated_at = excluded.local_updated_at,
           deleted_at = NULL,
           sync_status = 'pending'",
        params![
            &write.media_type,
            &write.item_key,
            serde_json::to_string(&write.row)?,
            &now
        ],
    )?;
    queue_local_change(
        &conn,
        "saveItem",
        &write.media_type,
        &write.item_key,
        serde_json::json!({ "mediaType": write.media_type, "itemKey": write.item_key, "row": write.row }),
        &now,
    )?;
    Ok(())
}

#[tauri::command]
fn delete_item(
    app: AppHandle,
    state: State<LibraryDb>,
    media_type: String,
    item_key: String,
) -> NativeResult<()> {
    let conn = open_db(&app, &state)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE media_items SET deleted_at = ?3, local_updated_at = ?3, sync_status = 'pending'
         WHERE media_type = ?1 AND item_key = ?2",
        params![&media_type, &item_key, &now],
    )?;
    queue_local_change(
        &conn,
        "deleteItem",
        &media_type,
        &item_key,
        serde_json::json!({ "mediaType": media_type, "itemKey": item_key }),
        &now,
    )?;
    Ok(())
}

#[tauri::command]
fn save_setting(
    app: AppHandle,
    state: State<LibraryDb>,
    write: NativeSettingWrite,
) -> NativeResult<()> {
    let conn = open_db(&app, &state)?;
    let now = Utc::now().to_rfc3339();
    let category = write.category.unwrap_or_default();
    let description = write.description.unwrap_or_default();
    conn.execute(
        "INSERT INTO settings (key, value, category, description, local_updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending')
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           category = excluded.category,
           description = excluded.description,
           local_updated_at = excluded.local_updated_at,
           sync_status = 'pending'",
        params![&write.key, &write.value, &category, &description, &now],
    )?;
    queue_local_change(
        &conn,
        "saveSetting",
        "setting",
        &write.key,
        serde_json::json!({
            "key": write.key,
            "value": write.value,
            "category": category,
            "description": description
        }),
        &now,
    )?;
    Ok(())
}

#[tauri::command]
fn import_asset(
    app: AppHandle,
    state: State<LibraryDb>,
    asset: NativeAssetImport,
) -> NativeResult<NativeAssetImportResult> {
    let conn = open_db(&app, &state)?;
    let source = PathBuf::from(&asset.source_path);
    let bytes = fs::read(&source)?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let sha256 = format!("{:x}", hasher.finalize());
    let ext = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("bin")
        .to_lowercase();
    let remote_object_key = sanitize_object_key(&asset.asset_key);
    let remote_url = r2_config()
        .ok()
        .map(|config| public_r2_url(&config, &remote_object_key));
    let data_dir = app_data_dir(&app)?;
    let media_dir = data_dir.join("media");
    fs::create_dir_all(&media_dir)?;
    let safe_name = asset
        .asset_key
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>();
    let dest = media_dir.join(format!("{safe_name}-{sha256}.{ext}"));
    fs::write(&dest, bytes)?;

    let now = Utc::now().to_rfc3339();
    let local_path = dest.to_string_lossy().to_string();
    let media_type = asset.media_type.unwrap_or_default();
    let item_key = asset.item_key.unwrap_or_default();
    conn.execute(
        "INSERT INTO assets (asset_key, media_type, item_key, kind, local_path, sha256, local_updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')
         ON CONFLICT(asset_key) DO UPDATE SET
           media_type = excluded.media_type,
           item_key = excluded.item_key,
           kind = excluded.kind,
           local_path = excluded.local_path,
           sha256 = excluded.sha256,
           local_updated_at = excluded.local_updated_at,
           sync_status = 'pending'",
        params![&asset.asset_key, &media_type, &item_key, &asset.kind, &local_path, &sha256, &now],
    )?;
    queue_local_change(
        &conn,
        "uploadAsset",
        "asset",
        &asset.asset_key,
        serde_json::json!({
            "assetKey": asset.asset_key,
            "mediaType": media_type,
            "itemKey": item_key,
            "kind": asset.kind,
            "localPath": local_path,
            "sha256": sha256,
            "remoteObjectKey": remote_object_key,
            "remoteUrl": remote_url.clone().unwrap_or_default()
        }),
        &now,
    )?;
    Ok(NativeAssetImportResult {
        asset_key: asset.asset_key,
        local_path,
        sha256,
        remote_url,
        remote_object_key: Some(remote_object_key),
        pending_sync: true,
    })
}

fn extension_from_asset(filename: Option<&str>, content_type: Option<&str>) -> String {
    if let Some(filename) = filename {
        if let Some(ext) = PathBuf::from(filename)
            .extension()
            .and_then(|value| value.to_str())
        {
            let lower = ext.to_lowercase();
            if lower == "jpg" || lower == "jpeg" || lower == "png" || lower == "webp" {
                return if lower == "jpeg" {
                    "jpg".to_string()
                } else {
                    lower
                };
            }
        }
    }

    let content_type = content_type.unwrap_or_default().to_lowercase();
    if content_type.contains("png") {
        "png".to_string()
    } else if content_type.contains("webp") {
        "webp".to_string()
    } else {
        "jpg".to_string()
    }
}

fn safe_asset_name(value: &str) -> String {
    let safe = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if safe.is_empty() {
        "asset".to_string()
    } else {
        safe
    }
}

fn first_row_value(row: &Row, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|key| {
            let value = as_trimmed_string(row.get(*key));
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        })
        .unwrap_or_default()
}

fn first_csv_values(value: &str, limit: usize) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|part| part.starts_with("http://") || part.starts_with("https://"))
        .take(limit)
        .map(ToString::to_string)
        .collect()
}

fn upgrade_tmdb_profile_image_size(remote_url: &str) -> String {
    if !remote_url.contains("image.tmdb.org/t/p/") {
        return remote_url.to_string();
    }

    let marker = "/t/p/";
    let Some(marker_index) = remote_url.find(marker) else {
        return remote_url.to_string();
    };
    let size_start = marker_index + marker.len();
    let Some(size_end_offset) = remote_url[size_start..].find('/') else {
        return remote_url.to_string();
    };
    let size_end = size_start + size_end_offset;
    format!(
        "{}h632{}",
        &remote_url[..size_start],
        &remote_url[size_end..]
    )
}

fn cache_cover_source(media_type: &str, row: &Row) -> String {
    match media_type {
        "book" => first_row_value(
            row,
            &[
                "R2CoverUrl",
                "r2CoverUrl",
                "imageUrl",
                "ImageURL",
                "ImageUrl",
                "Image URL",
                "Image",
            ],
        ),
        "movie" | "tv" => first_row_value(
            row,
            &[
                "R2CoverUrl",
                "r2CoverUrl",
                "posterUrl",
                "PosterURL",
                "metadataCoverUrl",
            ],
        ),
        "game" => first_row_value(
            row,
            &[
                "R2CoverUrl",
                "r2CoverUrl",
                "localCoverUrl",
                "LocalCoverURL",
                "coverUrl",
                "CoverURL",
                "metadataCoverUrl",
                "imageUrl",
                "ImageURL",
                "posterUrl",
            ],
        ),
        _ => String::new(),
    }
}

fn cache_backdrop_source(media_type: &str, row: &Row) -> String {
    match media_type {
        "movie" | "tv" => first_row_value(
            row,
            &[
                "R2BackdropUrl",
                "r2BackdropUrl",
                "backdropUrl",
                "BackdropURL",
            ],
        ),
        "game" => first_csv_values(
            &first_row_value(row, &["screenshotsUrl", "ScreenshotsURL"]),
            1,
        )
        .into_iter()
        .next()
        .unwrap_or_default(),
        _ => String::new(),
    }
}

fn extension_from_url_or_content_type(url: &str, content_type: Option<&str>) -> String {
    let without_query = url.split('?').next().unwrap_or_default();
    let ext = without_query
        .rsplit('.')
        .next()
        .unwrap_or_default()
        .to_lowercase();
    if ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "webp" {
        return if ext == "jpeg" {
            "jpg".to_string()
        } else {
            ext
        };
    }
    extension_from_asset(None, content_type)
}

fn existing_cached_asset_path(
    conn: &Connection,
    asset_key: &str,
    remote_url: &str,
) -> NativeResult<Option<String>> {
    let existing = conn
        .query_row(
            "SELECT local_path FROM assets WHERE asset_key = ?1 AND remote_url = ?2",
            params![asset_key, remote_url],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    Ok(existing.filter(|path| Path::new(path).exists()))
}

fn cache_remote_asset(
    conn: &Connection,
    client: &Client,
    media_dir: &Path,
    media_type: &str,
    item_key: &str,
    kind: &str,
    asset_key: &str,
    remote_url: &str,
) -> NativeResult<bool> {
    if remote_url.trim().is_empty()
        || !(remote_url.starts_with("http://") || remote_url.starts_with("https://"))
    {
        return Ok(false);
    }
    if existing_cached_asset_path(conn, asset_key, remote_url)?.is_some() {
        return Ok(false);
    }

    let response = client.get(remote_url).send()?;
    if !response.status().is_success() {
        return Err(NativeError::Message(format!(
            "Image fetch failed: HTTP {}",
            response.status()
        )));
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(ToString::to_string);
    let bytes = response.bytes()?;
    if bytes.is_empty() {
        return Ok(false);
    }

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let sha256 = format!("{:x}", hasher.finalize());
    let ext = extension_from_url_or_content_type(remote_url, content_type.as_deref());
    let safe_name = safe_asset_name(asset_key);
    let dest = media_dir.join(format!("{safe_name}-{sha256}.{ext}"));
    fs::write(&dest, &bytes)?;

    let now = Utc::now().to_rfc3339();
    let local_path = dest.to_string_lossy().to_string();
    conn.execute(
        "INSERT INTO assets (asset_key, media_type, item_key, kind, local_path, remote_url, sha256, remote_updated_at, local_updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, 'cached')
         ON CONFLICT(asset_key) DO UPDATE SET
           media_type = excluded.media_type,
           item_key = excluded.item_key,
           kind = excluded.kind,
           local_path = excluded.local_path,
           remote_url = excluded.remote_url,
           sha256 = excluded.sha256,
           remote_updated_at = excluded.remote_updated_at,
           local_updated_at = excluded.local_updated_at,
           sync_status = 'cached'",
        params![
            asset_key,
            media_type,
            item_key,
            kind,
            local_path,
            remote_url,
            sha256,
            now
        ],
    )?;
    Ok(true)
}

#[tauri::command]
fn cache_remote_media(
    app: AppHandle,
    state: State<LibraryDb>,
    limit: Option<i64>,
) -> NativeResult<CacheSummary> {
    let conn = open_db(&app, &state)?;
    let data_dir = app_data_dir(&app)?;
    let media_dir = data_dir.join("media");
    fs::create_dir_all(&media_dir)?;
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()?;
    let max_count = limit.unwrap_or(300).max(1);
    let mut cached = 0;
    let mut skipped = 0;
    let mut failed = 0;

    let rows = {
        let mut stmt = conn.prepare(
            "SELECT media_type, item_key, row_json FROM media_items WHERE deleted_at IS NULL ORDER BY rowid ASC",
        )?;
        let mapped = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;
        mapped.collect::<Result<Vec<_>, _>>()?
    };

    for (media_type, item_key, row_json) in rows {
        if cached >= max_count {
            break;
        }
        let row = serde_json::from_str::<Row>(&row_json)?;
        let sources = [
            ("cover".to_string(), cache_cover_source(&media_type, &row)),
            (
                "backdrop".to_string(),
                cache_backdrop_source(&media_type, &row),
            ),
        ];
        for (kind, remote_url) in sources {
            if cached >= max_count {
                break;
            }
            let asset_key = format!("cache/{media_type}/{item_key}/{kind}");
            match cache_remote_asset(
                &conn,
                &client,
                &media_dir,
                &media_type,
                &item_key,
                &kind,
                &asset_key,
                &remote_url,
            ) {
                Ok(true) => cached += 1,
                Ok(false) => skipped += 1,
                Err(_) => failed += 1,
            }
        }

        if media_type == "movie" || media_type == "tv" {
            let cast_urls = first_csv_values(
                &first_row_value(
                    &row,
                    &[
                        "topcastPhotos",
                        "TopcastPhotos",
                        "Topcast Photos",
                        "Cast Photos",
                    ],
                ),
                10,
            );
            for (index, remote_url) in cast_urls.iter().enumerate() {
                if cached >= max_count {
                    break;
                }
                let remote_url = upgrade_tmdb_profile_image_size(remote_url);
                let asset_key = format!("cache/{media_type}/{item_key}/cast-{index}");
                match cache_remote_asset(
                    &conn,
                    &client,
                    &media_dir,
                    &media_type,
                    &item_key,
                    "cast",
                    &asset_key,
                    &remote_url,
                ) {
                    Ok(true) => cached += 1,
                    Ok(false) => skipped += 1,
                    Err(_) => failed += 1,
                }
            }
        }
    }

    Ok(CacheSummary {
        cached,
        skipped,
        failed,
    })
}

#[tauri::command]
fn cache_icons(
    app: AppHandle,
    state: State<LibraryDb>,
    icons: Vec<IconCacheRequest>,
) -> NativeResult<Vec<IconCacheResult>> {
    let conn = open_db(&app, &state)?;
    let data_dir = app_data_dir(&app)?;
    let media_dir = data_dir.join("media");
    fs::create_dir_all(&media_dir)?;
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()?;
    let mut results = Vec::new();

    for icon in icons {
        let icon_type = sanitize_part(&icon.icon_type);
        let icon_key = sanitize_part(&icon.icon_key);
        if icon_type.is_empty() || icon_key.is_empty() || icon.remote_url.trim().is_empty() {
            results.push(IconCacheResult {
                icon_type,
                icon_key,
                remote_url: icon.remote_url,
                local_path: None,
            });
            continue;
        }

        let asset_key = format!("cache/icon/{icon_type}/{icon_key}");
        let _ = cache_remote_asset(
            &conn,
            &client,
            &media_dir,
            &icon_type,
            &icon_key,
            "icon",
            &asset_key,
            &icon.remote_url,
        );
        let local_path = conn
            .query_row(
                "SELECT local_path FROM assets WHERE asset_key = ?1 AND remote_url = ?2 AND local_path <> ''",
                params![&asset_key, &icon.remote_url],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .filter(|path| Path::new(path).exists());

        results.push(IconCacheResult {
            icon_type,
            icon_key,
            remote_url: icon.remote_url,
            local_path,
        });
    }

    Ok(results)
}

#[tauri::command]
fn cache_status(app: AppHandle, state: State<LibraryDb>) -> NativeResult<CacheStatus> {
    let conn = open_db(&app, &state)?;
    let rows = {
        let mut stmt = conn.prepare(
            "SELECT media_type, item_key, row_json FROM media_items WHERE deleted_at IS NULL ORDER BY rowid ASC",
        )?;
        let mapped = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;
        mapped.collect::<Result<Vec<_>, _>>()?
    };

    let mut total_covers = 0;
    let mut total_backdrops = 0;
    let mut total_cast_photos = 0;

    for (media_type, _item_key, row_json) in rows {
        let row = serde_json::from_str::<Row>(&row_json)?;
        if !cache_cover_source(&media_type, &row).is_empty() {
            total_covers += 1;
        }
        if !cache_backdrop_source(&media_type, &row).is_empty() {
            total_backdrops += 1;
        }
        if media_type == "movie" || media_type == "tv" {
            total_cast_photos += first_csv_values(
                &first_row_value(
                    &row,
                    &[
                        "topcastPhotos",
                        "TopcastPhotos",
                        "Topcast Photos",
                        "Cast Photos",
                    ],
                ),
                10,
            )
            .len() as i64;
        }
    }

    let cached_covers = conn.query_row(
        "SELECT COUNT(DISTINCT media_type || char(31) || item_key) FROM assets WHERE kind = 'cover' AND local_path <> ''",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    let cached_backdrops = conn.query_row(
        "SELECT COUNT(DISTINCT media_type || char(31) || item_key) FROM assets WHERE kind = 'backdrop' AND local_path <> ''",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    let cached_cast_photos = conn.query_row(
        "SELECT COUNT(*) FROM assets WHERE kind = 'cast' AND local_path <> ''",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    let cached_assets = conn.query_row(
        "SELECT COUNT(*) FROM assets WHERE local_path <> ''",
        [],
        |row| row.get::<_, i64>(0),
    )?;

    Ok(CacheStatus {
        cached_covers,
        total_covers,
        cached_backdrops,
        total_backdrops,
        cached_cast_photos,
        total_cast_photos,
        cached_assets,
    })
}

#[tauri::command]
fn save_asset_bytes(
    app: AppHandle,
    state: State<LibraryDb>,
    asset: NativeAssetBytes,
) -> NativeResult<NativeAssetImportResult> {
    if asset.bytes.is_empty() {
        return Err(NativeError::Message("Uploaded file is empty.".to_string()));
    }

    let conn = open_db(&app, &state)?;
    let mut hasher = Sha256::new();
    hasher.update(&asset.bytes);
    let sha256 = format!("{:x}", hasher.finalize());
    let ext = extension_from_asset(asset.filename.as_deref(), asset.content_type.as_deref());
    let remote_object_key = build_remote_object_key(&asset, &ext);
    let remote_url = r2_config()
        .ok()
        .map(|config| public_r2_url(&config, &remote_object_key));
    let data_dir = app_data_dir(&app)?;
    let media_dir = data_dir.join("media");
    fs::create_dir_all(&media_dir)?;
    let safe_name = safe_asset_name(&asset.asset_key);
    let dest = media_dir.join(format!("{safe_name}-{sha256}.{ext}"));
    fs::write(&dest, &asset.bytes)?;

    let now = Utc::now().to_rfc3339();
    let local_path = dest.to_string_lossy().to_string();
    let media_type = asset.media_type.unwrap_or_default();
    let item_key = asset.item_key.unwrap_or_default();
    conn.execute(
        "INSERT INTO assets (asset_key, media_type, item_key, kind, local_path, sha256, local_updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')
         ON CONFLICT(asset_key) DO UPDATE SET
           media_type = excluded.media_type,
           item_key = excluded.item_key,
           kind = excluded.kind,
           local_path = excluded.local_path,
           sha256 = excluded.sha256,
           local_updated_at = excluded.local_updated_at,
           sync_status = 'pending'",
        params![&asset.asset_key, &media_type, &item_key, &asset.kind, &local_path, &sha256, &now],
    )?;
    queue_local_change(
        &conn,
        "uploadAsset",
        "asset",
        &asset.asset_key,
        serde_json::json!({
            "assetKey": asset.asset_key,
            "mediaType": media_type,
            "itemKey": item_key,
            "kind": asset.kind,
            "localPath": local_path,
            "sha256": sha256,
            "filename": asset.filename.unwrap_or_default(),
            "contentType": asset.content_type.unwrap_or_default(),
            "title": asset.title.unwrap_or_default(),
            "objectKey": asset.object_key.unwrap_or_default(),
            "remoteObjectKey": remote_object_key,
            "remoteUrl": remote_url.clone().unwrap_or_default()
        }),
        &now,
    )?;
    Ok(NativeAssetImportResult {
        asset_key: asset.asset_key,
        local_path,
        sha256,
        remote_url,
        remote_object_key: Some(remote_object_key),
        pending_sync: true,
    })
}

#[tauri::command]
fn sync_status(app: AppHandle, state: State<LibraryDb>) -> NativeResult<SyncSummary> {
    sync_now(app, state, None)
}

#[tauri::command]
fn sync_now(
    app: AppHandle,
    state: State<LibraryDb>,
    target_id: Option<i64>,
) -> NativeResult<SyncSummary> {
    let conn = open_db(&app, &state)?;
    let pending_rows = {
        if let Some(target_id) = target_id {
            let mut stmt = conn.prepare(
                "SELECT id, op_type, entity_type, entity_key, payload_json, client_updated_at
                 FROM sync_queue
                 WHERE status = 'pending' AND id = ?1
                 ORDER BY id ASC",
            )?;
            let rows = stmt.query_map([target_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, op_type, entity_type, entity_key, payload_json, client_updated_at
                 FROM sync_queue
                 WHERE status = 'pending'
                 ORDER BY id ASC",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        }
    };

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()?;
    let mut pushed = 0;
    let mut skipped = 0;
    let mut failed = 0;
    let mut synced_ids: Vec<i64> = Vec::new();

    for (id, op_type, entity_type, entity_key, payload_json, client_updated_at) in pending_rows {
        let queued = serde_json::from_str::<Value>(&payload_json)?;
        if op_type == "uploadAsset" {
            let local_path = as_trimmed_string(queued.get("localPath"));
            let remote_object_key = as_trimmed_string(queued.get("remoteObjectKey"));
            let content_type = as_trimmed_string(queued.get("contentType"));
            if local_path.is_empty() || remote_object_key.is_empty() {
                conn.execute(
                    "UPDATE sync_queue SET last_error = ?2 WHERE id = ?1",
                    params![
                        id,
                        "Asset upload queue entry is missing localPath or remoteObjectKey."
                    ],
                )?;
                continue;
            }
            match r2_config().and_then(|config| {
                upload_file_to_r2(
                    &config,
                    &remote_object_key,
                    &local_path,
                    if content_type.is_empty() {
                        "image/jpeg"
                    } else {
                        &content_type
                    },
                )
            }) {
                Ok(remote_url) => {
                    conn.execute(
                        "UPDATE assets SET sync_status = 'synced', remote_url = ?2, remote_updated_at = ?3 WHERE asset_key = ?1",
                        params![&entity_key, &remote_url, Utc::now().to_rfc3339()],
                    )?;
                    conn.execute(
                        "UPDATE sync_queue SET status = 'synced', last_error = NULL WHERE id = ?1",
                        [id],
                    )?;
                    pushed += 1;
                    synced_ids.push(id);
                }
                Err(err) => {
                    conn.execute(
                        "UPDATE sync_queue SET last_error = ?2 WHERE id = ?1",
                        params![id, err.to_string()],
                    )?;
                    failed += 1;
                }
            }
            continue;
        }

        if remote_newer_than_queued(&conn, &entity_type, &entity_key, &client_updated_at)? {
            conn.execute(
                "UPDATE sync_queue SET status = 'skipped', last_error = ?2 WHERE id = ?1",
                params![
                    id,
                    "Skipped because the remote row has a newer LastModifiedAt."
                ],
            )?;
            mark_entity_synced(&conn, &entity_type, &entity_key)?;
            skipped += 1;
            continue;
        }

        let url = as_trimmed_string(queued.get("url"));
        if url.is_empty() || url.starts_with("native://") {
            skipped += 1;
            conn.execute(
                "UPDATE sync_queue SET last_error = ?2 WHERE id = ?1",
                params![id, "No remote write URL configured for this queued change."],
            )?;
            continue;
        }

        let mut body = queued.get("payload").cloned().unwrap_or(Value::Null);
        apply_game_status_flags(&mut body);
        if let Value::Object(ref mut body_obj) = body {
            body_obj.insert(
                "clientUpdatedAt".to_string(),
                Value::String(client_updated_at.clone()),
            );
        }

        let response = client.post(&url).json(&body).send();
        match response {
            Ok(res) => {
                let status = res.status();
                let text = res.text().unwrap_or_default();
                let lower = text.to_lowercase();
                let looks_like_error = !status.is_success()
                    || lower.starts_with("error")
                    || lower.contains("exception:")
                    || lower.contains("error:");
                if looks_like_error {
                    conn.execute(
                        "UPDATE sync_queue SET last_error = ?2 WHERE id = ?1",
                        params![id, format!("Remote write failed: HTTP {status} {text}")],
                    )?;
                    failed += 1;
                    continue;
                }

                conn.execute(
                    "UPDATE sync_queue SET status = 'synced', last_error = NULL WHERE id = ?1",
                    [id],
                )?;
                if entity_type == "setting" {
                    conn.execute(
                        "UPDATE settings SET sync_status = 'synced', remote_updated_at = ?2 WHERE key = ?1",
                        params![&entity_key, Utc::now().to_rfc3339()],
                    )?;
                } else if entity_type == "asset" {
                    conn.execute(
                        "UPDATE assets SET sync_status = 'synced', remote_updated_at = ?2 WHERE asset_key = ?1",
                        params![&entity_key, Utc::now().to_rfc3339()],
                    )?;
                } else {
                    conn.execute(
                        "UPDATE media_items SET sync_status = 'synced', remote_updated_at = ?3
                         WHERE media_type = ?1 AND item_key = ?2",
                        params![&entity_type, &entity_key, Utc::now().to_rfc3339()],
                    )?;
                }
                pushed += 1;
                synced_ids.push(id);
            }
            Err(err) => {
                conn.execute(
                    "UPDATE sync_queue SET last_error = ?2 WHERE id = ?1",
                    params![id, err.to_string()],
                )?;
                failed += 1;
            }
        }
    }

    if pushed > 0 {
        conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('last_sync_at', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [Utc::now().timestamp_millis().to_string()],
        )?;
    }

    let pending = conn.query_row(
        "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(SyncSummary {
        pushed,
        pulled: 0,
        skipped,
        failed,
        pending,
        synced_ids,
    })
}

#[tauri::command]
fn read_roadmap(app: AppHandle, state: State<LibraryDb>) -> NativeResult<Vec<Value>> {
    let conn = open_db(&app, &state)?;
    let local_raw = conn
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'roadmap_items'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .unwrap_or_else(|| "[]".to_string());

    if let Some(public_base_url) = config_value("R2_PUBLIC_URL") {
        let url = format!(
            "{}/roadmap/items.json?v={}",
            public_base_url.trim_end_matches('/'),
            Utc::now().timestamp_millis()
        );
        if let Ok(response) = Client::builder()
            .timeout(std::time::Duration::from_secs(12))
            .build()?
            .get(url)
            .header("cache-control", "no-store")
            .send()
        {
            if response.status().is_success() {
                if let Ok(raw) = response.text() {
                    if let Ok(items) = serde_json::from_str::<Vec<Value>>(&raw) {
                        conn.execute(
                            "INSERT INTO app_meta (key, value) VALUES ('roadmap_items', ?1)
                             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                            [serde_json::to_string(&items)?],
                        )?;
                        return Ok(items);
                    }
                }
            }
        }
    }

    Ok(serde_json::from_str(&local_raw)?)
}

#[tauri::command]
fn save_roadmap(app: AppHandle, state: State<LibraryDb>, items: Vec<Value>) -> NativeResult<()> {
    let conn = open_db(&app, &state)?;
    let raw = serde_json::to_string(&items)?;
    conn.execute(
        "INSERT INTO app_meta (key, value) VALUES ('roadmap_items', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [&raw],
    )?;

    if let Ok(config) = r2_config() {
        let _ = upload_bytes_to_r2(
            &config,
            "roadmap/items.json",
            raw.into_bytes(),
            "application/json",
        );
    }

    Ok(())
}

#[tauri::command]
fn open_external_url(url: String) -> NativeResult<()> {
    let target = url.trim();
    if !(target.starts_with("https://") || target.starts_with("http://")) {
        return Err(NativeError::Message(
            "Only http and https links can be opened.".to_string(),
        ));
    }

    std::process::Command::new("open").arg(target).spawn()?;
    Ok(())
}

#[tauri::command]
fn resolve_igdb_url(query: String, year: Option<String>) -> NativeResult<String> {
    let title = query.trim();
    if title.is_empty() {
        return Ok(String::new());
    }

    let year = year.unwrap_or_default();
    let clean_year = year.trim();
    let search_query = if clean_year.is_empty() || title.contains(clean_year) {
        title.to_string()
    } else {
        format!("{title} {clean_year}")
    };
    let escaped_query = search_query.replace('"', "");
    let body =
        format!("search \"{escaped_query}\"; fields id,name,slug,first_release_date; limit 10;");
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()?;
    let (client_id, client_secret) = igdb_config()?;
    let token = igdb_access_token(&client, &client_id, &client_secret)?;
    let response = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", &client_id)
        .header("Authorization", format!("Bearer {token}"))
        .header("Content-Type", "text/plain")
        .body(body)
        .send()?;
    if !response.status().is_success() {
        return Err(NativeError::Message(format!(
            "IGDB lookup failed: HTTP {}",
            response.status()
        )));
    }

    let games = response.json::<Vec<IgdbLookupGame>>()?;
    let wanted_year = clean_year.parse::<i32>().ok();
    let best = games
        .iter()
        .find(|game| {
            if wanted_year.is_none() {
                return false;
            }
            game.first_release_date
                .map(|timestamp| {
                    DateTime::from_timestamp(timestamp, 0)
                        .map(|date| date.format("%Y").to_string() == clean_year)
                        .unwrap_or(false)
                })
                .unwrap_or(false)
        })
        .or_else(|| games.first());

    if let Some(game) = best {
        if let Some(slug) = game.slug.as_deref().filter(|slug| !slug.trim().is_empty()) {
            return Ok(format!("https://www.igdb.com/games/{slug}"));
        }
    }

    let fallback_query = format!("site:igdb.com/games {search_query}");
    Ok(format!(
        "https://www.google.com/search?btnI=I&q={}",
        utf8_percent_encode(&fallback_query, R2_ENCODE_SET)
    ))
}

fn normalize_igdb_image_url(url: Option<&String>, size: &str) -> String {
    let raw = url.map(|value| value.trim()).unwrap_or_default();
    if raw.is_empty() {
        return String::new();
    }
    let https = if raw.starts_with("//") {
        format!("https:{raw}")
    } else {
        raw.to_string()
    };
    https.replace("/t_thumb/", size).replace("/t_720p/", size)
}

fn igdb_game_to_row(game: &IgdbLookupGame) -> Row {
    let mut row = Row::new();
    let title = game.name.clone().unwrap_or_default();
    let release_date = game
        .first_release_date
        .and_then(|timestamp| DateTime::from_timestamp(timestamp, 0))
        .map(|date| date.format("%Y-%m-%d").to_string())
        .unwrap_or_default();
    let year = if release_date.len() >= 4 {
        release_date[0..4].to_string()
    } else {
        String::new()
    };
    let cover_url = normalize_igdb_image_url(
        game.cover.as_ref().and_then(|cover| cover.url.as_ref()),
        "/t_cover_big/",
    );
    let screenshots_url = game
        .screenshots
        .as_ref()
        .map(|screenshots| {
            screenshots
                .iter()
                .map(|screenshot| normalize_igdb_image_url(screenshot.url.as_ref(), "/t_1080p/"))
                .filter(|url| !url.is_empty())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    let genres = game
        .genres
        .as_ref()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.name.as_ref())
                .map(|name| name.trim().to_string())
                .filter(|name| !name.is_empty())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    let platforms = game
        .platforms
        .as_ref()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.name.as_ref())
                .map(|name| name.trim().to_string())
                .filter(|name| !name.is_empty())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    let developer = game
        .involved_companies
        .as_ref()
        .and_then(|items| {
            items
                .iter()
                .filter_map(|item| item.company.as_ref()?.name.as_ref())
                .map(|name| name.trim().to_string())
                .find(|name| !name.is_empty())
        })
        .unwrap_or_default();
    row.insert("title".into(), Value::String(title.clone()));
    row.insert("year".into(), Value::String(year));
    row.insert("releaseDate".into(), Value::String(release_date));
    row.insert("posterUrl".into(), Value::String(cover_url.clone()));
    row.insert("imageUrl".into(), Value::String(cover_url.clone()));
    row.insert("coverUrl".into(), Value::String(cover_url));
    row.insert("screenshotsUrl".into(), Value::String(screenshots_url));
    row.insert(
        "igdbId".into(),
        Value::String(game.id.map(|id| id.to_string()).unwrap_or_default()),
    );
    row.insert(
        "igdbSlug".into(),
        Value::String(game.slug.clone().unwrap_or_default()),
    );
    row.insert(
        "externalUrl".into(),
        Value::String(
            game.slug
                .as_ref()
                .filter(|slug| !slug.trim().is_empty())
                .map(|slug| format!("https://www.igdb.com/games/{slug}"))
                .unwrap_or_default(),
        ),
    );
    row.insert(
        "igdbRating".into(),
        Value::String(
            game.rating
                .map(|rating| rating.to_string())
                .unwrap_or_default(),
        ),
    );
    row.insert("genres".into(), Value::String(genres));
    row.insert("platforms".into(), Value::String(platforms));
    row.insert("developer".into(), Value::String(developer));
    row.insert(
        "description".into(),
        Value::String(game.summary.clone().unwrap_or_default()),
    );
    row.insert("__isRecommendation".into(), Value::Bool(true));
    row
}

#[tauri::command]
fn discover_igdb_games(genre_ids: Option<Vec<i64>>) -> NativeResult<Vec<Row>> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(18))
        .build()?;
    let (client_id, client_secret) = igdb_config()?;
    let token = igdb_access_token(&client, &client_id, &client_secret)?;
    let now = Utc::now().timestamp();
    let recent_floor = now - 365 * 24 * 60 * 60;
    let upcoming_ceiling = now + 365 * 24 * 60 * 60;
    let fields = "fields id,name,slug,first_release_date,rating,summary,cover.url,screenshots.url,genres.name,platforms.name,involved_companies.company.name;";
    let genre_filter = genre_ids
        .unwrap_or_default()
        .into_iter()
        .filter(|id| *id > 0)
        .map(|id| id.to_string())
        .collect::<Vec<_>>();
    let genre_filter = if genre_filter.is_empty() {
        String::new()
    } else {
        format!(" & genres = ({})", genre_filter.join(","))
    };
    let bodies = [
        format!("{fields} where cover != null & first_release_date >= {now} & first_release_date <= {upcoming_ceiling}{genre_filter}; sort hypes desc; limit 18;"),
        format!("{fields} where cover != null & first_release_date <= {now} & first_release_date >= {recent_floor}{genre_filter}; sort total_rating_count desc; limit 18;"),
        format!("{fields} where cover != null & first_release_date <= {now}{genre_filter}; sort rating desc; limit 18;"),
    ];
    let mut by_key: HashMap<String, IgdbLookupGame> = HashMap::new();
    for body in bodies {
        let response = client
            .post("https://api.igdb.com/v4/games")
            .header("Client-ID", &client_id)
            .header("Authorization", format!("Bearer {token}"))
            .header("Content-Type", "text/plain")
            .body(body)
            .send()?;
        if !response.status().is_success() {
            return Err(NativeError::Message(format!(
                "IGDB discovery failed: HTTP {}",
                response.status()
            )));
        }
        for game in response.json::<Vec<IgdbLookupGame>>()? {
            let key = game
                .id
                .map(|id| id.to_string())
                .or_else(|| game.name.clone())
                .unwrap_or_default();
            if !key.is_empty() && !by_key.contains_key(&key) {
                by_key.insert(key, game);
            }
        }
    }
    Ok(by_key.values().take(20).map(igdb_game_to_row).collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(LibraryDb {
            path: Mutex::new(None),
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            read_snapshot,
            seed_snapshot,
            queue_sheet_write,
            save_item,
            delete_item,
            save_setting,
            cache_status,
            cache_icons,
            cache_remote_media,
            import_asset,
            save_asset_bytes,
            sync_status,
            sync_now,
            read_roadmap,
            save_roadmap,
            open_external_url,
            load_tv_episodes,
            resolve_igdb_url,
            discover_igdb_games
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
