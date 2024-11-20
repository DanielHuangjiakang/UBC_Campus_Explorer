let map, markers = [];
const selectedRooms = [];
const selectedBuildings = [];
const maxSelectedRooms = 5;
let timeMarkers = [];

const roomsData = [
    { id: 1, name: 'Room 101', building: 'Engineering', capacity: 30, furniture: ['Tables', 'Chairs'], lat: 49.2606, lng: -123.2460 },
    { id: 2, name: 'Room 202', building: 'Science', capacity: 50, furniture: ['Lab Benches'], lat: 49.2608, lng: -123.2463 },
    { id: 3, name: 'Room 303', building: 'Arts', capacity: 40, furniture: ['Easels', 'Stools'], lat: 49.2610, lng: -123.2465 },
    { id: 4, name: 'Room 404', building: 'Library', capacity: 20, furniture: ['Desks', 'Computers'], lat: 49.2612, lng: -123.2467 },
    { id: 5, name: 'Room 505', building: 'Business', capacity: 60, furniture: ['Conference Table', 'Chairs'], lat: 49.2614, lng: -123.2469 },
];

document.addEventListener('DOMContentLoaded', () => {
    const buildingInput = document.getElementById('buildingSelect');
    const minCapacity = document.getElementById('minCapacity');
    const furnitureInput = document.getElementById('furnitureSelect');
    const applyButton = document.getElementById('applyButton');
    const resetButton = document.getElementById('resetButton');
    const availableRooms = document.getElementById('availableRooms');
    const selectedRoomsContainer = document.getElementById('selectedRooms');
    const markersButton  = document.getElementById('markersButton');

    function updateAvailableRooms() {
        const building = buildingInput.value.toLowerCase();
        const capacity = parseInt(minCapacity.value || 0);
        const furniture = furnitureInput.value.toLowerCase();

        const filteredRooms = roomsData.filter(room => {
            return (!building || room.building.toLowerCase().includes(building)) &&
                (!capacity || room.capacity >= capacity) &&
                (!furniture || room.furniture.some(f => f.toLowerCase().includes(furniture)));
        });

        availableRooms.innerHTML = filteredRooms.map(room => `
            <div class="room-item">
                <h4>${room.name}</h4>
                <p>${room.building}, Capacity: ${room.capacity}</p>
            </div>
        `).join('');
    }

    applyButton.addEventListener('click', updateAvailableRooms);
    resetButton.addEventListener('click', () => {
        buildingInput.value = '';
        minCapacity.value = '';
        furnitureInput.value = '';
        updateAvailableRooms();
    });

    markersButton.addEventListener('click', async () => {
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

        const roomsData = await fetchRoomsData(allShortNames);

        if (roomsData.length > 0) {
            updateMarkers(roomsData);
        } else {
            console.log('No rooms data found');
        }
    });

    async function fetchRoomsData(queryInput) {
        try {
            const response = await fetch('http://localhost:4321/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryInput)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching room data:', error);
            return [];
        }
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

        // 初始化 DirectionsService 和 DirectionsRenderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
        });

    }

    function createCustomMarker(shortname) {
        // 创建一个 canvas 元素
        const canvas = document.createElement('canvas');
        const size = 30; // 图标的尺寸
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        // 绘制圆形
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI, false);
        context.fillStyle = '#007BFF'; // 圆形颜色
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#000000'; // 边框颜色
        context.stroke();

        // 添加文本（缩写）
        context.fillStyle = '#FFFF00'; // 文本颜色
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(shortname, size / 2, size / 2);

        // 将 canvas 转换为图像 URL
        return canvas.toDataURL();
    }

    function createSelectedMarker(shortname) {
        const canvas = document.createElement('canvas');
        const size = 30;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI, false);
        context.fillStyle = '#FFC0CB'; // 选中粉色
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
        // 清除旧标记
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        rooms.forEach(room => {
            // 创建初始标记
            const marker = new google.maps.Marker({
                position: { lat: room.rooms_lat, lng: room.rooms_lon },
                map: map,
                icon: createCustomMarker(room.rooms_shortname), // 默认颜色图标
                title: room.rooms_shortname
            });

            // 绑定点击事件
            marker.addListener('click', () => {
                toggleMarkerSelection(marker, room);
            });

            markers.push(marker);
        });
    }

    function toggleMarkerSelection(marker, room) {
        const isSelected = selectedBuildings.find(b => b.rooms_shortname === room.rooms_shortname);

        if (isSelected) {
            // 如果已选中，取消选择
            selectedBuildings.splice(selectedBuildings.indexOf(isSelected), 1);
            marker.setIcon(createCustomMarker(room.rooms_shortname)); // 恢复默认颜色
        } else {
            if (selectedBuildings.length >= 5) {
                alert('You can select up to 5 buildings only.'); // 提示用户
                return; // 不允许添加更多
            }
            // 如果未选中，添加到列表并更改颜色
            selectedBuildings.push(room);
            marker.setIcon(createSelectedMarker(room.rooms_shortname)); // 选中颜色
        }

        // 更新页面上的选中列表
        updateSelectedBuildingsList();
        calculateAndDisplayRoute(); // 更新路线和步行时间

    }

    function updateSelectedBuildingsList() {
        const selectedListContainer = document.getElementById('selectedBuildings');
        selectedListContainer.innerHTML = '';

        selectedBuildings.forEach(building => {
            const listItem = document.createElement('div');
            listItem.className = 'selected-building';
            listItem.textContent = building.rooms_shortname + ' (' + building.rooms_fullname + ')';
            selectedListContainer.appendChild(listItem);
        });
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

                    // 清除旧的时间标记
                    clearTimeMarkers();

                    const route = response.routes[0];
                    let totalDuration = 0;

                    route.legs.forEach((leg, index) => {
                        totalDuration += leg.duration.value; // 秒为单位

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
        timeMarkers.forEach(marker => marker.setMap(null)); // 移除标记
        timeMarkers = []; // 清空数组
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