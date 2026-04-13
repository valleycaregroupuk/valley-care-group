// Locator Feature logic

(function() {
  const HOMES = [
    {
      id: 'glan',
      name: 'Glan-yr-Afon Nursing Home',
      location: 'Blackwood',
      lat: 51.6644,
      lon: -3.2046,
      url: 'homes/glan-yr-afon.html'
    },
    {
      id: 'llys',
      name: 'Llys Gwyn Residential Home',
      location: 'Pyle, Bridgend',
      lat: 51.5280,
      lon: -3.7022,
      url: 'homes/llys-gwyn.html'
    },
    {
      id: 'pentwyn',
      name: 'Ty Pentwyn Nursing Home',
      location: 'Treorchy',
      lat: 51.6562,
      lon: -3.5011,
      url: 'homes/pentwyn.html'
    }
  ];

  // Haversine distance in miles
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async function geocode(query) {
    // Adding , UK to improve accuracy if not explicitly provided
    const q = query.toLowerCase().includes('uk') || query.toLowerCase().includes('wales') 
      ? query 
      : query + ', UK';
      
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q));
    if (!res.ok) throw new Error('Failed to fetch location');
    const data = await res.json();
    if (!data || data.length === 0) {
      throw new Error('Location not found');
    }
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name
    };
  }

  function renderResults(results, container) {
    container.innerHTML = '';
    
    results.forEach((result, index) => {
      const isClosest = index === 0;
      
      const card = document.createElement('div');
      card.className = `locator-card ${isClosest ? 'locator-card--closest' : ''}`;
      
      card.innerHTML = `
        <div class="locator-card-dist">
          <span class="locator-card-dist-num">${result.distance.toFixed(1)}</span>
          <span class="locator-card-dist-unit">miles</span>
        </div>
        <div class="locator-card-info">
          ${isClosest ? '<div class="locator-badge">📍 Nearest Home</div>' : ''}
          <div class="locator-card-name">${result.home.name}</div>
          <div class="locator-card-loc">${result.home.location}</div>
        </div>
        <div class="locator-card-action">
          <a href="${result.home.url}" class="btn ${isClosest ? 'btn-gold' : 'btn-outline'}">View Home</a>
        </div>
      `;
      container.appendChild(card);
    });
    container.style.display = 'flex';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('locator-btn');
    const input = document.getElementById('locator-input');
    const errorEl = document.getElementById('locator-error');
    const resultsEl = document.getElementById('locator-results');

    if (!btn || !input) return;

    btn.addEventListener('click', async () => {
      const query = input.value.trim();
      if (!query) {
        errorEl.textContent = 'Please enter a postcode or town.';
        errorEl.style.display = 'block';
        return;
      }

      errorEl.style.display = 'none';
      resultsEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Searching...';

      try {
        const coords = await geocode(query);
        
        const results = HOMES.map(home => {
          return {
            home,
            distance: calculateDistance(coords.lat, coords.lon, home.lat, home.lon)
          };
        });

        // Sort by closest
        results.sort((a, b) => a.distance - b.distance);

        renderResults(results, resultsEl);
        
      } catch (err) {
        errorEl.textContent = err.message === 'Location not found' 
          ? 'Sorry, we couldn\'t find that location. Please try adding "Wales" or a specific postcode.'
          : 'An error occurred while searching. Please try again.';
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Find Nearest';
      }
    });

    // Allow enter to submit
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btn.click();
      }
    });
  });
})();
