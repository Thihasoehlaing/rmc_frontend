"""
# Navigation Architecture Guide

## Overview
The application uses a flexible, API-driven navigation system where all sidebar items are manageable via API endpoints.

## Data Models

### NavItem interface (src/app/interfaces/navigation.interface.ts)
```typescript
interface NavItem {
  id: string;                    // Unique identifier
  label: string;                 // Display text
  icon?: string;                 // Icon emoji or font class
  route?: string;                // Navigation route (optional for folders)
  children?: NavItem[];          // Nested items (for collapsible folders)
  metadata?: Record<string, any>; // Future extensibility (permissions, condition flags, etc.)
}
```

### NavigationConfig interface
```typescript
interface NavigationConfig {
  items: NavItem[];
  version: string;
}
```

### UserProfile interface
```typescript
interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  timeZone?: string;
}
```

## Current Implementation (Static Mock)

The sidebar navigation is currently hardcoded in `sidebar.component.ts` for proof of concept:
- Dashboard
- RDIG Application Form (with children: Inbox, List, History)
- Conference Funding Application (with children)
- Journal Publication Funding (with children)
- Admin Settings (with children)

## Future API Integration

Replace the static `navItems` array in `sidebar.component.ts` with:

```typescript
ngOnInit() {
  this.navigationService.getNavigation().subscribe(config => {
    this.navItems = config.items;
  });
}
```

## Expected API Response Format

```json
{
  "data": {
    "items": [
      {
        "id": "dashboard",
        "label": "Dashboard",
        "icon": "📊",
        "route": "/dashboard"
      },
      {
        "id": "rdig-forms",
        "label": "RDIG Application Form",
        "children": [
          {
            "id": "rdig-inbox",
            "label": "Inbox",
            "route": "/rdig/inbox"
          }
        ]
      }
    ],
    "version": "1.0"
  }
}
```

## Sidebar Behavior

### Collapse/Hover Behavior
- **Collapsed Mode**: Shows only icons (width: 64px)
- **Hover Mode**: On mouse hover, sidebar expands to full width temporarily
- **Fixed Expanded Mode**: User can toggle fixed mode where sidebar stays expanded

### Toggle State Management
- Uses Angular Signals: `isSidebarCollapsed` and `isHovered`
- Smooth CSS transitions (0.3s)
- No jQuery—pure CSS and Angular

## Styling & Tokens

All styling uses CSS custom properties from `src/assets/styles/_colors.scss`:
- `--color-primary`: Main brand color (#2A83FF)
- `--color-label`: Text color (#000000)
- `--border-default`: Border color (#EEEEEE)
- `--sidebar-width`: 260px
- `--header-height`: 64px

## User Section in Sidebar

Currently displays static data:
- Username: "Admin User"
- Email: "admin@rmc.edu"
- Links: Profile, Logout

To integrate with real user data:

```typescript
ngOnInit() {
  this.authService.getCurrentUser().subscribe(user => {
    this.currentUser = user; // Bind to template
  });
}
```

## Example Usage in Components

Any component can inject the navigation service to:
1. Load navigation dynamically
2. Update user permissions dynamically
3. Show/hide items based on API response

```typescript
constructor(private navService: NavigationService) {}

ngOnInit() {
  this.navService.getNavigation().subscribe(nav => {
    // Update component logic with dynamic navigation
  });
}
```

## Folder Expansion

The sidebar maintains folder expansion state using Angular Signals:
- Click folder icon → toggles `expandedFolders` Set
- Uses `track by id` in `@for` loop for performance
- State is not persisted (resets on page reload)

## Future Enhancements

1. **Persist sidebar state**: Save collapse/hover preference to localStorage
2. **Role-based nav**: Filter navigation items based on user role from API
3. **Analytics**: Track which nav items users click
4. **Search**: Add search box to filter navigation items
5. **Custom icons**: Replace emojis with SVG icon component
"""
