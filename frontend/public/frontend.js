let map, markers = [];
let selectedRooms = [];
let selectedBuildings = [];
const maxSelectedRooms = 5;
let timeMarkers = [];
// Initialize an empty array to store dynamically fetched room data
let roomsData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Call loadRoomsData() when the page initializes
    loadRoomsData();
    const buildingInput = document.getElementById('buildingSelect');
    const minCapacity = document.getElementById('minCapacity');
    const furnitureInput = document.getElementById('furnitureSelect');
    const applyButton = document.getElementById('applyButton');
    const resetButton = document.getElementById('resetButton');
    const availableRooms = document.getElementById('availableRooms');
    const markersButton = document.getElementById('markersButton');

    // New elements for Room Capacity Distribution
    const buildingCapacitySelect = document.getElementById('buildingCapacitySelect');
    const buildingCapacityOptions = document.getElementById('buildingCapacityOptions');
    const capacityApplyButton = document.getElementById('capacityApplyButton');

    // Event listeners for clearing both building inputs when one is focused
    buildingInput.addEventListener('focus', () => {
        buildingInput.value = '';
        buildingCapacitySelect.value = '';
    });

    buildingCapacitySelect.addEventListener('focus', () => {
        buildingInput.value = '';
        buildingCapacitySelect.value = '';
    });

    // Fetch room data from the server using a POST request with the given query
    async function fetchRoomsData(queryInput) {
        try {
            const response = await fetch('http://localhost:4321/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryInput),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.result; // Return the result array from the response
        } catch (error) {
            console.error('Error fetching room data:', error);
            return [];
        }
    }

    // Fetch and load data when the page initializes
    async function loadRoomsData() {
        const queryInput = {
                "WHERE": {},
                "OPTIONS": {
                    "COLUMNS": [
                        "rooms_shortname",
                        "rooms_number",
                        "rooms_lat",
                        "rooms_lon",
                        "rooms_fullname",
                        "rooms_seats",
                        "rooms_furniture",
                        "rooms_address"
                    ]
                }
            }
        ;

        try {
            // Fetch room data
            roomsData = await fetchRoomsData(queryInput);
            // Populate datalist options dynamically
            populateBuildingOptions(roomsData);
            populateBuildingCapacityOptions(roomsData);


            // Populate furniture checkboxes dynamically
            populateFurnitureOptions(roomsData);

            // Ensure all rooms are displayed on initial load
            updateAvailableRooms();
        } catch (error) {
            console.error("Failed to load room data:", error);
            availableRooms.innerHTML = `<p style="color:red;">Failed to load room data. Please try again later.</p>`;
        }
    }

    // Function to populate the datalist with unique full names
    function populateBuildingCapacityOptions(roomsData) {
        // Clear existing options
        buildingCapacityOptions.innerHTML = '';

        // Extract unique building full names
        const uniqueFullNames = [...new Set(roomsData.map(room => room.rooms_fullname))];

        // Add options to the datalist
        uniqueFullNames.forEach(fullname => {
            const option = document.createElement('option');
            option.value = fullname;
            buildingCapacityOptions.appendChild(option);
        });
    }


    capacityApplyButton.addEventListener('click', handleCapacityApply);
    function handleCapacityApply() {
        const selectedBuildingFullName = buildingCapacitySelect.value.trim();

        if (!selectedBuildingFullName) {
            // Clear the chart if no building is selected
            clearCapacityChart();

            return;
        }

        function clearCapacityChart() {
            if (window.capacityChart) {
                window.capacityChart.destroy();
                window.capacityChart = null;
            }
        }

        getBuildingRoomCapacities(selectedBuildingFullName);
    }

    function getBuildingRoomCapacities(selectedBuildingFullName) {
        const data = roomsData.filter(room => room.rooms_fullname === selectedBuildingFullName);

        if (data.length === 0) {
            showErrorNotification("No rooms found for the selected building.");
            return;
        }

        renderCapacityChart(data, selectedBuildingFullName);
    }

    function renderCapacityChart(roomData, buildingName) {
        const ctx = document.getElementById('buildingCapacityChart').getContext('2d');

        // Extract room numbers and capacities
        const roomNumbers = roomData.map(room => room.rooms_number);
        const capacities = roomData.map(room => room.rooms_seats);

        // Destroy previous chart if exists
        if (window.capacityChart) {
            window.capacityChart.destroy();
        }

        // Create new chart
        window.capacityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: roomNumbers,
                datasets: [{
                    label: 'Room Capacity',
                    data: capacities,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Room Capacities in ${buildingName}`
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Room Number'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Capacity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }


    // Function to populate the datalist with unique full names
    function populateBuildingOptions(roomsData) {
        const buildingOptions = document.getElementById('buildingOptions');

        // Clear existing options
        buildingOptions.innerHTML = '';

        // Extract unique building full names
        const uniqueFullNames = [...new Set(roomsData.map(room => room.rooms_fullname))];

        // Add options to the datalist
        uniqueFullNames.forEach(fullname => {
            const option = document.createElement('option');
            option.value = fullname;
            buildingOptions.appendChild(option);
        });
    }

    // Function to dynamically populate furniture options
    function populateFurnitureOptions(roomsData) {
        const furnitureOptionsContainer = document.querySelector('.furniture-options');

        // Clear existing furniture options
        furnitureOptionsContainer.innerHTML = '';

        // Extract unique furniture types
        const furnitureSet = new Set();

        roomsData.forEach(room => {
            if (room.rooms_furniture) {
                // Remove "Classroom-" and split by "/" or "&"
                const cleanFurniture = room.rooms_furniture
                    .replace('Classroom-', '')
                    .split(/\/|&/)
                    .map(f => f.trim()); // Trim spaces around the types

                cleanFurniture.forEach(f => furnitureSet.add(f)); // Add each type to the set
            }
        });

        // Convert the Set back to an Array and dynamically create checkboxes
        [...furnitureSet].forEach(furniture => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${furniture}" class="furnitureCheckbox"> ${furniture}`;
            furnitureOptionsContainer.appendChild(label);
        });
    }

    // Function to initialize markers on the map
    async function initializeMarkers() {
        const allShortNames = {
            "WHERE": {},
            "OPTIONS": {
                "COLUMNS": [
                    "rooms_shortname",
                    "rooms_lat",
                    "rooms_lon",
                    "rooms_fullname"
                ]
            },
            "TRANSFORMATIONS": {
                "GROUP": [
                    "rooms_shortname",
                    "rooms_lat",
                    "rooms_lon",
                    "rooms_fullname"
                ],
                "APPLY": [
                    {
                        "maxSeats": {
                            "MAX": "rooms_seats"
                        }
                    }
                ]
            }
        };

        try {
            // Fetch room data
            const allBuildings = await fetchRoomsData(allShortNames);

            if (allBuildings.length > 0) {
                // Update map markers with fetched data
                updateMarkers(allBuildings);
            } else {
                console.log('No rooms data found');
            }
        } catch (error) {
            console.error('Error initializing markers:', error);
        }
    }

    initializeMarkers();


    // Render the list of available rooms based on user filters
    function updateAvailableRooms() {
        const building = buildingInput.value.toLowerCase().trim(); // Get building filter
        const capacity = parseInt(minCapacity.value.trim() || 0); // Get capacity filter

        // Get selected furniture types
        const selectedFurniture = Array.from(document.querySelectorAll('.furnitureCheckbox:checked'))
            .map(checkbox => checkbox.value.toLowerCase());

        // Filter rooms based on input values
        const filteredRooms = roomsData.filter(room => {
            const roomFurniture = room.rooms_furniture
                .replace('Classroom-', '')
                .toLowerCase();
            const furnitureList = roomFurniture.split(/\/|&/).map(f => f.trim());

            const matchesBuilding = !building || room.rooms_fullname.toLowerCase().includes(building);
            const matchesCapacity = !capacity || room.rooms_seats >= capacity;
            const matchesFurniture = selectedFurniture.length === 0 ||
                selectedFurniture.every(f => furnitureList.includes(f));

            return matchesBuilding && matchesCapacity && matchesFurniture;
        });

        // Generate HTML for filtered rooms
        if (filteredRooms.length > 0) {
            availableRooms.innerHTML = filteredRooms.map((room, index) => `
            <div class="room-item" data-index="${index}">
                <h4>${room.rooms_shortname} ${room.rooms_number}</h4>
                <p>Building: ${room.rooms_fullname}, Capacity: ${room.rooms_seats}</p>
            </div>
        `).join('');

            // Bind click events to dynamically generated room items
            document.querySelectorAll('.room-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const roomIndex = item.getAttribute('data-index');
                    addSelectedRoom(filteredRooms[roomIndex]);
                });
            });
        } else {
            availableRooms.innerHTML = `<p>No rooms available based on the current filters.</p>`;
        }
    }

    function showErrorNotification(message) {
        const notification = document.getElementById('errorNotification');
        notification.textContent = message; // Set the error message
        notification.style.display = 'block'; // Show the notification

        // Automatically hide the notification after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }


    function addSelectedRoom(room) {
        // Check if the limit for rooms in a building is exceeded
        const buildingExists = selectedBuildings.find(b => b.rooms_fullname === room.rooms_fullname);

        if (!buildingExists && selectedBuildings.length >= maxSelectedRooms) {
            // Show error notification and prevent adding the room
            showErrorNotification("Maximum limit reached. You cannot select more than 5 buildings.");
            return;
        }

        if (selectedRooms.length >= maxSelectedRooms) {
            // Show error notification and prevent adding the room
            showErrorNotification("Maximum limit reached. You cannot select more than 5 Rooms.");
            return;
        }

        if (!selectedRooms.find(r => r.rooms_shortname === room.rooms_shortname && r.rooms_number === room.rooms_number)) {
            selectedRooms.push(room);

            // Update the Selected Rooms list in the UI
            const selectedRoomsContainer = document.getElementById('selectedRooms');

            // Create a new room card
            const roomCard = document.createElement('div');
            roomCard.className = 'room-item';
            roomCard.innerHTML = `
            <h4>${room.rooms_shortname} ${room.rooms_number}</h4>
            <p><strong>Full Name:</strong> ${room.rooms_fullname}</p>
            <p><strong>Address:</strong> ${room.rooms_address || 'N/A'}</p>
            <p><strong>Capacity:</strong> ${room.rooms_seats}</p>
        `;

            // Add event listener for deselection
            roomCard.addEventListener('click', () => {
                removeSelectedRoom(room);
                roomCard.remove(); // Remove the room card from the UI
            });

            selectedRoomsContainer.appendChild(roomCard);

            // Add the building to the Selected Buildings list if not already present
            if (!buildingExists) {
                addSelectedBuilding(room);
            }
        }
    }

    function removeSelectedRoom(room) {
        // Remove the room from the selectedRooms array
        selectedRooms = selectedRooms.filter(
            r => !(r.rooms_shortname === room.rooms_shortname && r.rooms_number === room.rooms_number)
        );

        // Check if there are any other rooms left in the same building
        const roomsInBuilding = selectedRooms.filter(r => r.rooms_fullname === room.rooms_fullname);

        if (roomsInBuilding.length === 0) {
            // If no rooms are left, remove the building from Selected Buildings
            removeBuilding({ rooms_fullname: room.rooms_fullname, rooms_shortname: room.rooms_shortname });
        } else {
            // Update the Selected Rooms UI
            updateSelectedRoomsUI();
        }
    }


    function removeMarkerFromMap(room) {
        // Find the marker for the building
        const markerIndex = markers.findIndex(marker => marker.title === room.rooms_shortname);
        if (markerIndex !== -1) {
            markers[markerIndex].setMap(null); // Remove the marker from the map
            markers.splice(markerIndex, 1); // Remove it from the markers array
        }
    }


    async function updateSelectedBuildingsList() {
        const selectedListContainer = document.getElementById('selectedBuildings');
        selectedListContainer.innerHTML = ''; // Clear the container

        // Check if there are at least two buildings to calculate walking time
        if (selectedBuildings.length >= 2) {
            const directions = await calculateWalkingTimes(selectedBuildings);
            renderBuildingBoxesWithTimes(selectedBuildings, directions, selectedListContainer);
        } else {
            // Render buildings without time if less than two
            renderBuildingBoxesWithoutTimes(selectedBuildings, selectedListContainer);
        }
    }

    async function calculateWalkingTimes(buildings) {
        if (buildings.length < 2) return []; // No directions needed for a single building

        const directionsService = new google.maps.DirectionsService();
        const directions = [];

        for (let i = 0; i < buildings.length - 1; i++) {
            const start = new google.maps.LatLng(buildings[i].rooms_lat, buildings[i].rooms_lon);
            const end = new google.maps.LatLng(buildings[i + 1].rooms_lat, buildings[i + 1].rooms_lon);

            try {
                const response = await directionsService.route({
                    origin: start,
                    destination: end,
                    travelMode: google.maps.TravelMode.WALKING,
                });

                const duration = response.routes[0].legs[0].duration.text; // Walking time
                directions.push(duration);
            } catch (error) {
                console.error('Error fetching directions:', error);
                directions.push('N/A'); // Use 'N/A' if the API fails
            }
        }

        return directions; // Array of walking times
    }

    function renderBuildingBoxesWithTimes(buildings, directions, container) {
        buildings.forEach((building, index) => {
            // Create a building box
            const buildingDiv = document.createElement('div');
            buildingDiv.className = 'building-box';
            buildingDiv.innerHTML = `
            <div>
                <h4>${building.rooms_fullname}</h4>
            </div>
        `;

            // Add click event listener
            buildingDiv.addEventListener('click', () => {
                removeBuilding(building);
            });

            container.appendChild(buildingDiv);

            // Add walking time if there's a next building
            if (index < buildings.length - 1) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'walking-time';
                timeDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 5px;">
                    <img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2I1eWVhb3J6Zms1dHA2ZXhvcmQ4NTgycml5bWptajIzeGR0MXdndCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WQHruG55EKkLJdXOud/giphy.webp" width="20" height="20">
                    <span>${directions[index]}</span>
                </div>
            `;
                container.appendChild(timeDiv);
            }
        });
    }


    function renderBuildingBoxesWithoutTimes(buildings, container) {
        buildings.forEach(building => {
            const buildingDiv = document.createElement('div');
            buildingDiv.className = 'building-box';
            buildingDiv.innerHTML = `
            <div>
                <h4>${building.rooms_fullname}</h4>
            </div>
        `;

            // Add click event listener
            buildingDiv.addEventListener('click', () => {
                removeBuilding(building);
            });

            container.appendChild(buildingDiv);
        });
    }

    function removeBuilding(building) {
        // Remove the building from selectedBuildings
        selectedBuildings = selectedBuildings.filter(b => b.rooms_fullname !== building.rooms_fullname);

        // Update the selected buildings list in the UI
        updateSelectedBuildingsList();

        // Update the map marker to default icon
        const marker = markers.find(m => m.title === building.rooms_shortname);
        if (marker) {
            marker.setIcon(createCustomMarker(building.rooms_shortname)); // Reset to default icon
        }

        // Remove any selected rooms from this building
        selectedRooms = selectedRooms.filter(r => r.rooms_fullname !== building.rooms_fullname);

        // Update the selected rooms list in the UI
        updateSelectedRoomsUI();

        // Recalculate and display the route
        calculateAndDisplayRoute();
    }

    function updateSelectedRoomsUI() {
        const selectedRoomsContainer = document.getElementById('selectedRooms');
        selectedRoomsContainer.innerHTML = ''; // Clear the container

        selectedRooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-item';
            roomCard.innerHTML = `
            <h4>${room.rooms_shortname} ${room.rooms_number}</h4>
            <p><strong>Full Name:</strong> ${room.rooms_fullname}</p>
            <p><strong>Address:</strong> ${room.rooms_address || 'N/A'}</p>
            <p><strong>Capacity:</strong> ${room.rooms_seats}</p>
        `;

            // Add event listener for deselection
            roomCard.addEventListener('click', () => {
                removeSelectedRoom(room);
                roomCard.remove(); // Remove the room card from the UI
            });

            selectedRoomsContainer.appendChild(roomCard);
        });
    }

    function addSelectedBuilding(room) {
        // Check if the building is already in the selected list
        if (!selectedBuildings.find(b => b.rooms_fullname === room.rooms_fullname)) {
            // If the limit of 5 buildings is reached, show an error notification and return
            if (selectedBuildings.length >= maxSelectedRooms) {
                showErrorNotification("Maximum limit reached. You cannot select more than 5 buildings.");
                return;
            }

            // Add the new building to the list
            selectedBuildings.push({
                rooms_shortname: room.rooms_shortname,
                rooms_fullname: room.rooms_fullname,
                rooms_lat: room.rooms_lat,
                rooms_lon: room.rooms_lon
            });

            // Update the Selected Buildings list in the UI
            updateSelectedBuildingsList();

            // Update the map marker to default icon
            const marker = markers.find(m => m.title === room.rooms_shortname);
            if (marker) {
                marker.setIcon(createSelectedMarker(room.rooms_shortname)); // Reset to default icon
            }

            // Recalculate and display the route
            calculateAndDisplayRoute();

            updateSelectedRooms();
        }
    }

    // Event listeners for Apply and Reset buttons
    applyButton.addEventListener('click', updateAvailableRooms);
    resetButton.addEventListener('click', () => {
        buildingInput.value = '';
        minCapacity.value = '';

        const furnitureCheckboxes = document.querySelectorAll('.furnitureCheckbox');
        furnitureCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        updateAvailableRooms();
    });


    function updateSelectedRooms() {
        selectedRoomsContainer.innerHTML = '';
        selectedRooms.forEach(room => {
            const roomBadge = document.createElement('span');
            roomBadge.textContent = `${room.name} (${room.capacity} seats)`;
            roomBadge.className = 'badge';
            selectedRoomsContainer.appendChild(roomBadge);
        });

        updateMarkers();
    }

    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 49.26655335, lng: -123.24983897521201 },
            zoom: 15,
        });

        // 初始化 DirectionsService 和 DirectionsRenderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
        });

    }

    // Create a custom marker for map
    function createCustomMarker(shortname) {
        const canvas = document.createElement('canvas');
        const size = 30; // Marker size
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        // Draw a circle for the marker
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI, false);
        context.fillStyle = '#007BFF'; // Circle color
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#000000'; // Border color
        context.stroke();

        // Add text to the marker (shortname)
        context.fillStyle = '#FFFF00'; // Text color
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(shortname, size / 2, size / 2);

        return canvas.toDataURL(); // Return the marker as a data URL
    }

    function createSelectedMarker(shortname) {
        const canvas = document.createElement('canvas');
        const size = 30;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI, false);
        context.fillStyle = '#FFC0CB';
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = '#000000';
        context.stroke();

        context.fillStyle = '#FFFFFF';
        context.font = 'bold 8px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(shortname, size / 2, size / 2);

        return canvas.toDataURL();
    }

    function updateMarkers(rooms) {
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        rooms.forEach(room => {
            const marker = new google.maps.Marker({
                position: { lat: room.rooms_lat, lng: room.rooms_lon },
                map: map,
                icon: createCustomMarker(room.rooms_shortname), // 默认颜色图标
                title: room.rooms_shortname
            });

            marker.addListener('click', () => {
                toggleMarkerSelection(marker, room);
            });

            markers.push(marker);
        });
    }


    // Toggle marker selection on click
    function toggleMarkerSelection(marker, room) {
        const isSelected = selectedBuildings.find(b => b.rooms_shortname === room.rooms_shortname);

        if (isSelected) {
            // If already selected, deselect it
            selectedBuildings.splice(selectedBuildings.indexOf(isSelected), 1);
            marker.setIcon(createCustomMarker(room.rooms_shortname)); // Reset to default color
            selectedRooms = selectedRooms.filter(r => r.rooms_fullname !== room.rooms_fullname);
            updateSelectedRoomsUI();
        } else {
            if (selectedBuildings.length >= 5) {
                // Use the error-notification instead of alert
                showErrorNotification("Maximum limit reached. You cannot select more than 5 buildings.");
                return;
            }
            // If not selected, add to the selected list and change marker color
            selectedBuildings.push(room);
            marker.setIcon(createSelectedMarker(room.rooms_shortname)); // Change to selected color
        }
        updateSelectedBuildingsList(); // Update selected buildings list in UI
        calculateAndDisplayRoute();
    }

    function calculateAndDisplayRoute() {
        if (selectedBuildings.length < 2) {
            directionsRenderer.set('directions', null);
            clearTimeMarkers();
            return;
        }

        const waypoints = selectedBuildings.slice(1, -1).map(building => ({
            location: new google.maps.LatLng(building.rooms_lat, building.rooms_lon),
            stopover: true,
        }));

        directionsService.route(
            {
                origin: new google.maps.LatLng(selectedBuildings[0].rooms_lat, selectedBuildings[0].rooms_lon),
                destination: new google.maps.LatLng(
                    selectedBuildings[selectedBuildings.length - 1].rooms_lat,
                    selectedBuildings[selectedBuildings.length - 1].rooms_lon
                ),
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.WALKING,
            },
            (response, status) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(response);

                    //
                    clearTimeMarkers();

                    const route = response.routes[0];
                    let totalDuration = 0;

                    route.legs.forEach((leg, index) => {
                        totalDuration += leg.duration.value; //

                        const startBuilding = selectedBuildings[index].rooms_shortname;
                        const endBuilding = selectedBuildings[index + 1].rooms_shortname;

                        const midLat = (leg.start_location.lat() + leg.end_location.lat()) / 2;
                        const midLng = (leg.start_location.lng() + leg.end_location.lng()) / 2;

                        const timeMarker = new google.maps.Marker({
                            position: { lat: midLat, lng: midLng },
                            map: map,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#007BFF',
                                fillOpacity: 1,
                                strokeWeight: 2,
                                strokeColor: '#FFFFFF',
                            },
                        });

                        timeMarkers.push(timeMarker);

                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                            <div style="color: black; font-size: 12px; padding: 5px; text-align: center;">
                                <strong>${startBuilding} - ${endBuilding}</strong><br>
                                Walking time: ${leg.duration.text}<br>
                                Distance: ${leg.distance.text}
                            </div>`,
                            disableAutoPan: true, // 禁止自动居中
                            position: { lat: midLat, lng: midLng },
                        });

                        timeMarker.addListener('mouseover', () => {
                            infoWindow.open(map);
                        });

                        timeMarker.addListener('mouseout', () => {
                            infoWindow.close();
                        });
                    });

                    const messageContainer = document.getElementById('selectionMessage');
                    messageContainer.textContent = `Total walking time: ${Math.ceil(totalDuration / 60)} minutes`;
                } else {
                    console.error('Directions request failed due to ' + status);
                }
            }
        );
    }


    function clearTimeMarkers() {
        timeMarkers.forEach(marker => marker.setMap(null)); //
        timeMarkers = []; //
    }

    initMap();
});