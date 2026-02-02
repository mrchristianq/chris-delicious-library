# Adding New Settings - Quick Reference

## How Settings Persistence Works

All settings in Chris' Delicious Library now automatically persist through:
1. **Google Sheet** - Source of truth, synced across devices
2. **localStorage** - Instant backup, survives network failures

When reading: Google Sheet → localStorage → default value
When saving: localStorage (immediate) + Google Sheet (async)

## Template for Adding a New Setting

### 1. Add State Variable
```tsx
const [mySetting, setMySetting] = useState<number>(defaultValue);
```

### 2. Load Setting on Page Load
In the `useEffect` around line 575:
```tsx
setMySetting(getSetting("mySetting", 100)); // "100" is the default
```

### 3. Create Update Function
```tsx
const updateMySetting = (value: number) => {
  setMySetting(value);
  saveSetting("mySetting", value, "My Category", "Description of this setting");
};
```

### 4. Add to "Save All Settings" (around line 640)
```tsx
const settings = [
  // ... existing settings ...
  { key: "mySetting", value: mySetting, category: "My Category", description: "Description of this setting" },
];
```

### 5. Use in UI
```tsx
<input 
  value={mySetting}
  onChange={(e) => updateMySetting(Number(e.target.value))}
/>
```

## That's It!

Your setting will automatically:
- ✅ Save to Google Sheet
- ✅ Cache to localStorage
- ✅ Persist across page refreshes
- ✅ Work even if Google Sheet is temporarily down
- ✅ Show detailed logs in browser console
- ✅ Include console error messages if something fails

## Debugging Console Messages

When you change a setting, you'll see logs like:

```
✅ Cached setting locally: mySetting = 42
✅ Saved setting to sheet: mySetting = 42
```

Or if there's an error:

```
⚠️ Failed to save setting mySetting to sheet: 403 Forbidden - using local cache
```

The local cache ensures your settings are never lost!

## Parameter Guide for saveSetting()

```tsx
saveSetting(
  "mySettingKey",           // Unique identifier (must match getSetting key)
  newValue,                 // The value to save
  "Category Name",          // For organizing in the sheet
  "Human readable description" // Helps identify the setting
);
```
