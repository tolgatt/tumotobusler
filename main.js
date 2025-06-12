const map = L.map('map').setView([41.0161, 28.9944], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let markers = L.markerClusterGroup();
  let allMarkers = [];
  let updateIntervalID;
  let lastUpdateTime = 0;

  function getCustomIcon(garage) {
    let iconUrl;
    if (!garage || garage === "null") {
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
    } else if (["Hasanpaşa", "Edirnekapı"].includes(garage.trim())) {
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    } else {
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png';
    }
    return L.icon({
      iconUrl: iconUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    });
  }

  function getGarageClass(garageName) {
    if (!garageName) return 'red';
    if (["Hasanpaşa", "Edirnekapı"].includes(garageName)) return 'blue';
    return 'black';
  }

  function generatePopupHTML(vehicle) {
    const containerClass = getGarageClass(vehicle.garageName);
    return `
      <div class="popup-container ${containerClass}">
        <div class="popup-header">
          <div class="door-code">🚌 ${vehicle.vehicleDoorCode}</div>
          <div class="plate">${vehicle.numberPlate}</div>
        </div>
        <div class="popup-section">
          <strong>🚏 Garaj:</strong> ${vehicle.garageName || '<span style="color:red;">—</span>'}<br>
          <strong>🏢 Firma:</strong> ${vehicle.operatorType}<br>
          <strong>🕒 Son güncelleme:</strong> ${vehicle.lastLocationDate} - ${vehicle.lastLocationTime}
        </div>
        <div class="popup-section">
          <strong>🗓️ Model:</strong>${vehicle.brandName} ${vehicle.modelYear}<br>
          <strong>🚌 Tür:</strong> ${vehicle.vehicleType}<br>
          <strong>🪑 Kapasite:</strong> ${vehicle.seatingCapacity} / ${vehicle.fullCapacity}
        </div>
        <div class="popup-icons">
          <div class="icon-badge ${vehicle.hasUsbCharger ? '' : 'disabled'}">🔌 USB</div>
          <div class="icon-badge ${vehicle.hasWifi ? '' : 'disabled'}">📶 Wi-Fi</div>
          <div class="icon-badge ${vehicle.hasBicycleRack ? '' : 'disabled'}">🚲 Bisiklet</div>
          <div class="icon-badge ${vehicle.accessibility ? '' : 'disabled'}">\267f️ Erişim</div>
          <div class="icon-badge ${vehicle.isAirConditioned ? '' : 'disabled'}">❄️ Klima</div>
        </div>
        <a class="popup-link" href="https://tumotobusler.vercel.app/gorev.html?arac=${vehicle.vehicleDoorCode}&utm_source=harita" target="_blank">🔗 Detaylı görev bilgisi</a><br>
        <a class="popup-link" href="https://arac.iett.gov.tr/${vehicle.vehicleDoorCode}" target="_blank">🔗 Araç İETT</a>
      </div>
    `;
  }

  function updateGeoJSON() {
    const now = Date.now();
    if (now - lastUpdateTime < 60000) {
      alert('1 dakikada birden sık güncelleme yapılamaz.');
      return;
    }
    document.getElementById('loading').style.display = 'block';
    fetch('https://arac.iett.gov.tr/api/task/bus-fleet/buses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      markers.clearLayers();
      allMarkers = [];
      data.forEach(vehicle => {
        const lat = vehicle.latitude;
        const lon = vehicle.longitude;
        if (!lat || !lon) return;
        const marker = L.marker([lat, lon], {
          icon: getCustomIcon(vehicle.garageName),
          opacity: 1
        });
        marker.feature = { properties: vehicle };
        const popup = generatePopupHTML(vehicle);
        marker.bindPopup(popup);
        markers.addLayer(marker);
        allMarkers.push(marker);
      });
      map.addLayer(markers);
      document.getElementById('loading').style.display = 'none';
      lastUpdateTime = Date.now();
    })
    .catch(err => {
      console.error(err);
      document.getElementById('loading').innerHTML = 'Veri alınamadı.';
    });
  }

  function filterMarkers() {
    const value = document.getElementById('search').value.toLowerCase();
    markers.clearLayers();
    if (!value) {
      allMarkers.forEach(marker => markers.addLayer(marker));
      return;
    }
    allMarkers.forEach(marker => {
      const p = marker.feature.properties;
      if ((value.startsWith("34") && p.numberPlate.toLowerCase().includes(value)) ||
          (!value.startsWith("34") && p.vehicleDoorCode.toLowerCase().includes(value))) {
        markers.addLayer(marker);
      }
    });
  }

  function setUpdateInterval() {
    const newIntervalMin = parseInt(document.getElementById('update-interval').value);
    if (!isNaN(newIntervalMin) && newIntervalMin >= 1 && newIntervalMin <= 20) {
      clearInterval(updateIntervalID);
      updateIntervalID = setInterval(updateGeoJSON, newIntervalMin * 60000);
    }
  }

  // Event Listeners
  document.getElementById('update-button').addEventListener('click', updateGeoJSON);
  document.getElementById('search').addEventListener('input', filterMarkers);
  document.getElementById('update-interval').addEventListener('input', setUpdateInterval);
  document.getElementById('legend').addEventListener('click', () => {
    const content = document.getElementById('legend-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
  });
  document.getElementById('toggle-btn').addEventListener('click', () => {
    const control = document.getElementById('control-container');
    control.style.display = control.style.display === 'block' ? 'none' : 'block';
  });

  // İlk yükleme ve otomatik güncelleme başlat
  updateGeoJSON();
  updateIntervalID = setInterval(updateGeoJSON, 300000); // 5 dakika
