# Group Ironmen Tracker Frontend and Backend
Website: [groupiron.men](https://groupiron.men)

Source for plugin: [https://github.com/christoabrown/group-ironmen-tracker](https://github.com/christoabrown/group-ironmen-tracker)

This repo is for the frontend website and backend of the above plugin.

This plugin tracks information about your group ironman player and sends it to a server where you and your other group members can view it. Currently it tracks:

* Inventory, equipment, bank, rune pouch, and shared bank
* Skill XP
* World position, viewable in an interactive map
* HP, prayer, energy, and world as well as showing inactivity
* Quest state - completed, finished, in progress

## Data Architecture and Integration

This website uses a three-source data architecture to provide rich information about your Group Ironman team:

### 1. RuneLite Plugin Data (Primary Source)
* Real-time game telemetry directly from each player's client
* Highest priority in the data hierarchy
* Provides the most up-to-date and accurate information about player state
* Used for inventory, equipment, skills, location, and other dynamic game data

### 2. Wise Old Man API (Secondary Source)
* Historical data and hiscores information from [Wise Old Man](https://wiseoldman.net/)
* Used as a fallback when plugin data isn't available
* Provides skill levels, boss kill counts, and achievement tracking
* Synced on a schedule and cached to reduce API usage

### 3. OSRS Wiki Integration (Enrichment Source)
* Static game information from the [Old School RuneScape Wiki](https://oldschool.runescape.wiki/)
* Used to enrich data with item details, monster information, and game mechanics
* Provides images, descriptions, and metadata for items, skills, and bosses
* Cached to improve performance and reduce API requests

### Data Merging Hierarchy
The application implements a clear data priority system:
1. Plugin data is always preferred when available (most accurate)
2. Wise Old Man data is used when plugin data is unavailable
3. Wiki data supplements both with static game information

Each panel in the application visually indicates which data source is being used via badges:
* (P) - Plugin data
* (W) - Wise Old Man data 
* (K) - Wiki data

## Features

The website includes the following integrated modules:

* **Activities** - Track recent player activities and achievements
* **Boss Strategy** - Share and coordinate boss tactics for your group
* **Collection Log** - View and track item collection across multiple data sources with visual badges
* **Data Sync** - Manage synchronization of player data from multiple sources
* **DPS Calculator** - Calculate and compare damage output for different setups
* **Group Challenges** - Create and track custom challenges for your group
* **Group Milestones** - Set and monitor progress towards important milestones
* **Shared Calendar** - Coordinate group activities and schedule events
* **Slayer Tasks** - Track and share Slayer assignments across the group
* **Valuable Drops** - Log and display notable item drops for group members
* **Wiki Integration** - Seamless access to OSRS Wiki information within the app

## Featured Module: Collection Log

The Collection Log has been enhanced with multi-source data integration:

### Collection Log Features:
* **Plugin-First Architecture**: Always prioritizes RuneLite plugin data for accuracy
* **Fallback Data Sources**: Seamlessly incorporates Wise Old Man achievements and Wiki information when plugin data is unavailable
* **Visual Source Indicators**: Each item shows its data source with color-coded badges:
  * (P) - Plugin data (green)
  * (W) - Wise Old Man data (blue)
  * (K) - Wiki data (orange)
* **DOM-Based Integration**: Non-invasive enhancement of the existing collection log UI without modifying plugin code
* **Item Enrichment**: Tooltips with Wiki descriptions and images for items
* **Manual Sync Controls**: Force refresh data from all sources on demand
* **Status Panel**: Shows the status and last update time of each data source

### Performance Optimizations:
* **Smart Caching**: Data is cached to minimize API requests and improve loading times
* **Throttled API Calls**: Prevents rate limiting with Wise Old Man and Wiki APIs
* **Background Synchronization**: Regular data refreshes happen in the background without UI interruption
* **Loading Indicators**: Visual feedback during data fetch operations

### User Experience Enhancements:
* **Consistent Styling**: Maintains the OSRS visual aesthetic with RuneScape fonts and styling
* **Responsive Design**: Works on various screen sizes
* **Error Handling**: Graceful fallbacks when data sources are unavailable
* **Event-Based Updates**: Collection log refreshes when plugin data changes

# Self-hosting

It is possible to self-host the frontend and backend rather than use [groupiron.men](https://groupiron.men).

In the plugin settings, put the URL that you are hosting the website on. Leaving it blank will default to https://groupiron.men.

![](https://i.imgur.com/0JFD7D5.png)


## With Docker

Prerequisites

* Docker
* docker-compose

### With docker-compose

Copy the `docker-compose.yml`, `.env.example`, and `schema.sql` (exists in `server/src/sql`) files onto your server.

Copy the contents of `.env.example` into a new file named `.env` in the same directory and fill it with your secrets.

The `.env` file explains what should go into each secret.

The `docker-compose.yml` has a line that takes the path to the `schema.sql`. Make sure to update this to the relative or absolute path of the file on your server.

After you have set up the `.env` file and `schema.sql` path, you can run `docker-compose up -d` and this will spin up both the frontend and backend. The backend should be available on port 5000 and the frontend on port 4000, although these can be changed in the docker-compose file.

### Without docker-compose (untested)

If you are not using the docker-compose, then you will have to set up the Postgres database and pass secrets in using Docker environment variables. See below in the [Without Docker](#without-docker) section for how to set up the database.

You can then run the following to run the image for the frontend, adding the values of the environment variables:

```sh
docker run -d -e HOST_URL= chrisleeeee/group-ironmen-tracker-frontend
```

Same thing for the backend:

```sh
docker run -d -e PG_USER= -e PG_PASSWORD= -e PG_HOST= -e PG_PORT=  -e PG_DB= -e BACKEND_SECRET= chrisleeeee/group-ironmen-tracker-backend
```

Check `.env.example` for an explanation on what the value of each environment variable should be.

Once it's running, the backend should be available on port 8080 and the frontend on port 4000.

## Without Docker

To be filled...

## API Integration Configuration

When self-hosting, you'll need to configure the following API integrations:

### Wise Old Man API
No API key is required, but consider implementing rate limiting to avoid overloading their service.

### OSRS Wiki API
Uses the public Wiki API. No API key required, but respect their usage policy:
- Cache responses to minimize requests
- Limit concurrent requests 
- Add proper attribution when displaying Wiki content

## Caching Strategy

To optimize performance and reduce external API calls:

- **Wise Old Man data**: Cached for 6 hours by default
- **Wiki data**: Cached for 24 hours by default
- **Plugin data**: Stored in the database and considered fresh for 15 minutes

Cache durations are configurable in the application settings.
