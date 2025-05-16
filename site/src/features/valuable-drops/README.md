# Valuable Drops Feature

This feature allows Group Ironmen to track, filter, and analyze valuable item drops received by group members.

## Components

### ValuableDropsPanel

The main component that displays:

- A table of valuable drops with sorting and filtering
- Group-wide drop statistics
- Controls for adding and deleting drops

## Setup

1. The feature is modularly designed and can be imported from the features index:

```javascript
import { ValuableDropsPanel } from '../features';
```

2. Once imported, include it in your application layout:

```jsx
<ValuableDropsPanel />
```

## API Endpoints

This feature uses the following API endpoints from the custom routes:

- `GET /custom/valuable-drops` - Retrieves valuable drops with filtering and sorting
- `POST /custom/valuable-drops` - Adds a new valuable drop
- `DELETE /custom/valuable-drops/:dropId` - Deletes a valuable drop
- `GET /custom/valuable-drops/stats` - Retrieves drop statistics

## Features

### Filtering

Users can filter drops by:
- Player name
- Item name
- Value range (min/max)
- Source name (boss/monster)

### Sorting

Drops can be sorted by:
- Item name
- Player name
- Value
- Quantity
- Source
- Date (default)

### Statistics

The statistics tab shows:
- Total group value from drops
- Most valuable drop
- Average drop value
- Per-player statistics

## Integration with RuneLite Plugin

This feature is designed to receive data from the Group Ironmen Tracker plugin. The drops can either be:

1. Automatically submitted from the plugin when valuable drops are detected
2. Manually added through the UI

## Styling

The component follows the Group Ironmen UI guidelines using:
- OSRS-themed fonts and colors
- Consistent styling with other components
- Responsive design for different screen sizes
