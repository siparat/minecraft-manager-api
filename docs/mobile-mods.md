# Mobile Mods API for Kotlin

## Mod Details With Similar Mods And Trending Position

Pass the current app id when opening a mod details screen:

```http
GET /mod/{modId}?appId={appId}
Language: en
```

Response includes `trendingPosition` and up to 3 random mods from the same app, excluding the current mod:

```json
{
  "id": 10,
  "title": "Current Mod",
  "trendingPosition": 2,
  "similarMods": [
    { "id": 11, "title": "Similar Mod 1" },
    { "id": 12, "title": "Similar Mod 2" },
    { "id": 13, "title": "Similar Mod 3" }
  ]
}
```

`trendingPosition` is the mod position in the “Trending” section sorted by manual relevance order. If `appId` is missing or the mod is not linked to this app, it is `null`.

If `appId` is missing, invalid, or the app has no other mods, `similarMods` is an empty array.

## Mod Of The Day

Use this endpoint for the “Mod of the day” section:

```http
GET /apps/{appId}/mod/day
Language: en
```

The response is one mod from the top 5 mods of the app sorted by manual order. It is stable for the current UTC day and changes automatically on the next UTC day.

```kotlin
fun getModOfDay(baseUrl: String, appId: Int): String {
    val request = Request.Builder()
        .url("$baseUrl/apps/$appId/mod/day")
        .header("Language", "en")
        .get()
        .build()

    client.newCall(request).execute().use { response ->
        check(response.isSuccessful) { "Mod of day failed: ${response.code}" }
        return response.body?.string().orEmpty()
    }
}
```

## New Mods

Use this endpoint for the “New” section:

```http
GET /apps/{appId}/mod/new?take=10
Language: en
```

Mods are sorted by the date they were added to this app. The newest app mods are first.

```kotlin
fun getNewMods(baseUrl: String, appId: Int): String {
    val request = Request.Builder()
        .url("$baseUrl/apps/$appId/mod/new?take=10")
        .header("Language", "en")
        .get()
        .build()

    client.newCall(request).execute().use { response ->
        check(response.isSuccessful) { "New mods failed: ${response.code}" }
        return response.body?.string().orEmpty()
    }
}
```

## OkHttp Example

```kotlin
import okhttp3.OkHttpClient
import okhttp3.Request

private val client = OkHttpClient()

fun getModDetails(baseUrl: String, modId: Int, appId: Int): String {
    val request = Request.Builder()
        .url("$baseUrl/mod/$modId?appId=$appId")
        .header("Language", "en")
        .get()
        .build()

    client.newCall(request).execute().use { response ->
        check(response.isSuccessful) { "Mod details failed: ${response.code}" }
        return response.body?.string().orEmpty()
    }
}
```
