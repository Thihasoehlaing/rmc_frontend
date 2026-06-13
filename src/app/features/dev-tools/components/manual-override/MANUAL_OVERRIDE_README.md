# Manual Override UI

## Overview
The **Manual Override Component** provides a comprehensive UI for developers and QA testers to manually override application values, component states, and configurations during development and testing.

## Features

### 1. **Master Toggle**
- Enable/disable all manual overrides with a single switch
- Shows count of active overrides
- Visual feedback of override state

### 2. **Add Override Values**
- Create custom override key-value pairs
- Support for multiple data types:
  - **String**: Text values (e.g., API endpoints, labels)
  - **Number**: Numeric values (e.g., timeouts, counts)
  - **Boolean**: True/false flags (e.g., isLoading, isDisabled)
  - **JSON**: Complex objects and arrays
  - **Date**: Date/time values

### 3. **Active Overrides Management**
- View all currently active overrides in a clean list format
- Each override shows:
  - Override key (name)
  - Current value
  - Data type badge
  - Optional description
  - Remove button for individual overrides
- Quick actions:
  - **JSON Edit**: Edit all overrides in bulk via JSON
  - **Export**: Download overrides as JSON file
  - **Import**: Load overrides from JSON file
  - **Clear All**: Remove all overrides at once

### 4. **Preset Test Profiles**
Pre-configured test scenarios ready to apply instantly:

| Profile | Purpose | Use Case |
|---------|---------|----------|
| **Empty Form Test** | Test with all empty fields | Validation testing |
| **Max Content Test** | Test with maximum data | Performance, UI scaling |
| **Error State Test** | Simulate error conditions | Error handling, UX |
| **Accessibility Test** | Test a11y features | WCAG compliance |
| **Responsive Test - Mobile** | Mobile viewport simulation | Responsive design |
| **Performance Test** | Large dataset handling | Performance benchmarks |

### 5. **Custom Profiles**
- Save current overrides as a reusable profile
- Name and describe your test scenario
- Load profiles instantly
- Delete custom profiles
- All profiles stored in component state

### 6. **JSON Bulk Editor**
- Edit multiple overrides in JSON format
- Real-time validation
- Error messages for invalid JSON
- Import/export functionality

## Usage Examples

### Example 1: Override Form Values
```typescript
// Add overrides to test your form with different data

Override Key: formData
Type: JSON
Value: {
  "title": "Test Title",
  "email": "test@example.com",
  "isActive": true
}
Description: Test form with sample data
```

### Example 2: Simulate Loading State
```
Override Key: isLoading
Type: boolean
Value: true
Description: Simulate API loading state
```

### Example 3: Test Large Dataset
```
Override Key: itemCount
Type: number
Value: 10000
Description: Large dataset for performance testing
```

### Example 4: Override API Configuration
```
Override Key: apiUrl
Type: string
Value: https://staging-api.example.com
Description: Use staging API instead of production
```

## Integration with Parent Component

### Step 1: Import the Component
```typescript
import { ManualOverrideComponent } from './components/manual-override/manual-override.component';

@Component({
  selector: 'app-dev-test-board',
  imports: [
    ManualOverrideComponent,
    // ... other imports
  ],
  templateUrl: './dev-test-board.component.html'
})
export class DevTestBoardComponent {
  // Component logic
}
```

### Step 2: Add to Template
```html
<!-- In your dev test board component template -->
<app-manual-override></app-manual-override>

<!-- Your other test components here -->
<div class="test-components">
  <!-- Your testing UI -->
</div>
```

### Step 3: Subscribe to Override Changes (Optional)
The component logs all override changes to the console. You can extend it to emit events:

```typescript
// In manual-override.component.ts
@Output() overrideApplied = new EventEmitter<OverrideValue>();

// In method:
this.overrideApplied.emit(newOverride);
```

Then in parent component:
```html
<app-manual-override 
  (overrideApplied)="onOverrideApplied($event)">
</app-manual-override>
```

## Exported/Imported JSON Format

### Export Format
```json
{
  "overrides": [
    {
      "key": "isLoading",
      "value": true,
      "type": "boolean",
      "description": "Simulate loading state"
    },
    {
      "key": "timeout",
      "value": 5000,
      "type": "number",
      "description": "Request timeout in ms"
    }
  ],
  "timestamp": "2026-04-09T10:30:00.000Z"
}
```

## Storage
- Overrides are stored in component state using Angular signals
- Profiles can be saved and persist during the session
- Use export/import for persistence across sessions

## Console Output
All override actions are logged to browser console with `[Override]` prefix:
```
[Override] Added/Updated: {...}
[Override] Removed: isLoading
[Override] All cleared
[Profile] Applied: Empty Form Test
[Profile] Saved: My Custom Profile
```

## Data Type Details

### String
Plain text values. Examples:
- API endpoints
- Form labels
- Button text
- Error messages

### Number
Numeric values. Examples:
- Timeouts (milliseconds)
- Counts/quantities
- Font sizes (pixels)
- Delays

### Boolean
True/false values. Examples:
- Loading states
- Disabled/enabled flags
- Feature toggles
- Debug modes

### JSON
Complex structured data. Examples:
```json
{
  "user": {
    "id": 123,
    "email": "test@example.com",
    "roles": ["admin", "user"]
  }
}
```

### Date
Date/time values. Format: ISO 8601

## Keyboard Shortcuts
- **Tab**: Navigate between form fields
- **Enter**: Add new override (when focused on form)
- **Delete**: Remove override (when focused on list item)

## Accessibility
- Full keyboard navigation
- ARIA labels on all interactive elements
- High contrast mode support
- Screen reader friendly

## Browser DevTools Integration
View all active overrides in console:
```javascript
// Access from DevTools console
// (Note: would need to expose via window object in production)
window.__APP_OVERRIDES__ = component.overrideValues;
```

## Best Practices

1. **Name Keys Clearly**
   - Use camelCase: `isLoading`, `apiUrl`, `maxRetries`
   - Avoid abbreviations: use `isLoading` not `isl`

2. **Add Descriptions**
   - Always describe the purpose of the override
   - Help other developers understand test intent

3. **Save Reusable Profiles**
   - Create profiles for recurring test scenarios
   - Share profiles with team members

4. **Export Before Session Ends**
   - Export complex override sets for documentation
   - Archive test scenarios used in bug reports

5. **Use Preset Profiles**
   - Start with presets as templates
   - Modify as needed for your test case

## Troubleshooting

### Issue: JSON Parse Error
- Ensure valid JSON syntax
- Use JSON validator: https://jsonlint.com
- Check for trailing commas

### Issue: Override Not Working
- Verify override is enabled (master toggle on)
- Check browser console for logs
- Confirm override key matches expected name

### Issue: Lost Overrides
- Export current overrides file for backup
- Check browser console for unsaved data
- Reload page carefully

## Permissions
- No special permissions required
- Development/testing only feature
- Should be disabled in production

## Future Enhancements
- [ ] Localstorage persistence across sessions
- [ ] Override history with undo/redo
- [ ] Override conditions (if/then logic)
- [ ] API response mocking
- [ ] Time-based override expiration
- [ ] Network throttling controls
- [ ] Component state snapshots
- [ ] Share override URLs with team

## Related Components
- Dev Test Board Form (parent)
- Custom Header Component
- Searchable Dropdown Component

## Support
For issues or feature requests, contact the development team.
