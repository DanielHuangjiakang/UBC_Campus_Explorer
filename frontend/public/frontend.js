const roomsData = [
    { id: 1, name: 'Room 101', building: 'Engineering', capacity: 30, furniture: ['Tables', 'Chairs'], lat: 49.2606, lng: -123.2460 },
    { id: 2, name: 'Room 202', building: 'Science', capacity: 50, furniture: ['Lab Benches'], lat: 49.2608, lng: -123.2463 },
    { id: 3, name: 'Room 303', building: 'Arts', capacity: 40, furniture: ['Easels', 'Stools'], lat: 49.2610, lng: -123.2465 },
    { id: 4, name: 'Room 404', building: 'Library', capacity: 20, furniture: ['Desks', 'Computers'], lat: 49.2612, lng: -123.2467 },
    { id: 5, name: 'Room 505', building: 'Business', capacity: 60, furniture: ['Conference Table', 'Chairs'], lat: 49.2614, lng: -123.2469 },
];

let map, markers = [];
const selectedRooms = [];
const maxSelectedRooms = 5;

document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('query');
    const searchButton = document.getElementById('searchButton');
    const availableRooms = document.getElementById('availableRooms');
    const selectedRoomsContainer = document.getElementById('selectedRooms');

    searchButton.addEventListener('click', () => {
        const query = queryInput.value.toLowerCase();
        availableRooms.innerHTML = '';
        const filteredRooms = roomsData.filter(room => {
            return room.name.toLowerCase().includes(query) ||
                room.building.toLowerCase().includes(query) ||
                room.capacity.toString().includes(query) ||
                room.furniture.some(f => f.toLowerCase().includes(query));
        });

        if (filteredRooms.length === 0) {
            availableRooms.innerHTML = '<p>No rooms found</p>';
        } else {
            filteredRooms.forEach(room => {
                const roomDiv = document.createElement('div');
                roomDiv.className = 'room-item';
                roomDiv.innerHTML = `<h4>${room.name}</h4><p>${room.building}, Capacity: ${room.capacity}</p>`;
                roomDiv.addEventListener('click', () => selectRoom(room));
                availableRooms.appendChild(roomDiv);
            });
        }
    });

    function selectRoom(room) {
        if (selectedRooms.length >= maxSelectedRooms) return;
        if (selectedRooms.find(r => r.id === room.id)) return;

        selectedRooms.push(room);
        updateSelectedRooms();
    }

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
            center: { lat: 49.2606, lng: -123.2460 },
            zoom: 15,
        });
    }

    function updateMarkers() {
        markers.forEach(marker => marker.setMap(null));
        markers = selectedRooms.map(room => {
            return new google.maps.Marker({
                position: { lat: room.lat, lng: room.lng },
                map: map,
                title: room.name,
            });
        });
    }

    const ctx = document.getElementById('capacityChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roomsData.map(r => r.name),
            datasets: [{
                label: 'Room Capacity',
                data: roomsData.map(r => r.capacity),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    initMap();
});
