# Plan: "Find Our Nearest Home" Feature

The goal is to develop a "Find Our Nearest Home" feature on the main page (`index.html`). This feature will allow users to enter their postcode or town, and it will list the three care homes (Glan-yr-Afon, Llys Gwyn, Ty Pentwyn) ordered by estimated distance from the user.

## User Review Required
This feature involves interacting with an external geocoding API to convert postcodes/towns to coordinates, and calculating distances. 
- Are you comfortable with using a free public API like Nominatim (OpenStreetMap) for geocoding user input? (No API key required, but subject to usage limits - fine for this scale).
- Alternatively, we could just calculate straight-line distances if they provide a postcode, using a simple local lookup table of Welsh postcodes if we want to avoid external APIs, but an external API is much better and more flexible. 
- For this implementation, I propose using the free Nominatim API.

## Proposed Changes

### `frontend/index.html`
- **[MODIFY]** `frontend/index.html`
  - Add a new section for the "Find Our Nearest Home" feature. This section will include:
    - An input field for "Enter your Postcode or Town".
    - A "Search" button.
    - A hidden container to display the results.
  - The results container will show cards for each home, sorted by distance, with "X miles away" text.
  - The section should be placed logically, perhaps just before or after the "Our Homes" Bento Grid. I suggest replacing or adding it near the "Our Homes" Bento Grid (`#our-homes`).

### `frontend/assets/js/main.js` (or a new `locator.js`)
- **[NEW]** `frontend/assets/js/locator.js` (Include this in `index.html`)
  - Define static coordinates for the three homes:
    - Glan-yr-Afon: ~ 51.666, -3.204 (Blackwood)
    - Llys Gwyn: ~ 51.528, -3.702 (Pyle)
    - Ty Pentwyn: ~ 51.656, -3.501 (Treorchy)
  - Add an event listener to the search button.
  - Fetch coordinates for the user's input using `fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(input + ', UK'))`.
  - Calculate the Haversine distance between the user's coordinates and each home.
  - Sort the homes by distance.
  - Render the sorted HTML results and display the container.

### `frontend/assets/css/pages.css`
- **[MODIFY]** `frontend/assets/css/pages.css`
  - Add styles for the locator section.
  - Styles for the input group (input + button).
  - Styles for the results cards (similar to bento cards but horizontal).

## Open Questions

- Should I place the "Find nearest home" form directly inside the `#our-homes` section, e.g., above the Bento grid, or as a completely new section?
- Standard straight-line distance (Haversine formula) will be used. Is this acceptable over driving distance (which would require a paid routing API)?

## Verification Plan

### Manual Verification
- Enter a known postcode (e.g., CF42 for Treorchy) and verify Ty Pentwyn is listed first.
- Enter "Blackwood" and verify Glan-yr-Afon is listed first.
- Verify the UI looks premium, matches the site's aesthetics, and uses glassmorphism/gold accents.
- Test responsivness on mobile.
