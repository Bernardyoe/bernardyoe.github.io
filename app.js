// ============================================
// SISTEM AUTENTIKASI & MANAJEMEN USER
// ============================================

// Data pengguna tersimpan di localStorage
let currentUser = null;
const ADMIN_CODE = 'SEGARA2025';

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Cek apakah user sudah login
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
    
    // Load admin schedules jika ada
    loadAdminSchedules();
    
    // Set minimum date untuk booking (hari ini)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal-berangkat').setAttribute('min', today);
    document.getElementById('kargo-tanggal').setAttribute('min', today);
    
    // Setup observer untuk animasi
    setupAnimationObserver();
});

// Toggle admin code field saat register
function toggleAdminCode() {
    const role = document.getElementById('registerRole').value;
    const adminCodeField = document.getElementById('adminCodeField');
    
    if (role === 'admin') {
        adminCodeField.classList.add('show');
    } else {
        adminCodeField.classList.remove('show');
    }
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Ambil semua user dari localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Cari user dengan email dan password yang cocok
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        alert('✅ Login berhasil! Selamat datang, ' + user.name);
        closeAuthModal();
        updateUIForLoggedInUser();
    } else {
        alert('❌ Email atau password salah!');
    }
}

// Handle Register
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const role = document.getElementById('registerRole').value;
    const adminCode = document.getElementById('adminCode').value;
    
    // Validasi
    if (password !== passwordConfirm) {
        alert('❌ Password dan konfirmasi password tidak cocok!');
        return;
    }
    
    if (password.length < 6) {
        alert('❌ Password minimal 6 karakter!');
        return;
    }
    
    // Validasi kode admin
    if (role === 'admin' && adminCode !== ADMIN_CODE) {
        alert('❌ Kode admin salah!');
        return;
    }
    
    // Ambil semua user dari localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Cek apakah email sudah terdaftar
    if (users.find(u => u.email === email)) {
        alert('❌ Email sudah terdaftar!');
        return;
    }
    
    // Buat user baru
    const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password,
        role: role,
        createdAt: new Date().toISOString()
    };
    
    // Simpan ke localStorage
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Auto login setelah register
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    alert('✅ Registrasi berhasil! Selamat datang, ' + name);
    closeAuthModal();
    updateUIForLoggedInUser();
    
    // Reset form
    document.getElementById('registerForm').reset();
}

// Update UI untuk user yang sudah login
function updateUIForLoggedInUser() {
    const userMenu = document.getElementById('userMenu');
    
    if (currentUser) {
        // Tampilkan info user dan tombol logout
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const roleBadge = currentUser.role === 'admin' ? '<span class="admin-badge">ADMIN</span>' : '';
        
        userMenu.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initials}</div>
                <div class="user-details">
                    <div class="user-name">${currentUser.name} ${roleBadge}</div>
                    <div class="user-role">${currentUser.role === 'admin' ? 'Administrator' : 'Pengguna'}</div>
                </div>
            </div>
            <button class="logout-btn" onclick="handleLogout()">Logout</button>
        `;
        
        // Tampilkan menu admin jika user adalah admin
        if (currentUser.role === 'admin') {
            document.getElementById('adminNavLink').style.display = 'block';
        } else {
            document.getElementById('adminNavLink').style.display = 'none';
        }
    } else {
        userMenu.innerHTML = `<button class="login-btn" onclick="showAuthModal()">Login / Register</button>`;
        document.getElementById('adminNavLink').style.display = 'none';
    }
}

// Handle Logout
function handleLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUIForLoggedInUser();
        
        // Redirect ke halaman beranda
        showSection('beranda');
        
        alert('✅ Anda telah logout');
    }
}

// Show/Hide Auth Modal
function showAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// Switch Auth Tab
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

// ============================================
// SISTEM BOOKING & PENCARIAN JADWAL
// ============================================

const ports = {
    'jakarta': { full: 'Jakarta (Pelabuhan Tanjung Priok)', short: 'Jakarta' },
    'palembang': { full: 'Palembang (Pelabuhan Boom Baru)', short: 'Palembang' },
    'pangkalpinang': { full: 'Bangka (Pelabuhan Pangkal Balam)', short: 'Bangka' },
    'batam': { full: 'Batam (Pelabuhan Batu Ampar)', short: 'Batam' },
    'tanjungpinang': { full: 'Tanjung Pinang (Pelabuhan Sri Bintan Pura)', short: 'Tanjung Pinang' },
    'pontianak': { full: 'Pontianak (Pelabuhan Dwikora)', short: 'Pontianak' },
    'medan': { full: 'Medan (Pelabuhan Belawan)', short: 'Medan' },
    'kijing': { full: 'Kijing (Pelabuhan Kijing)', short: 'Kijing' },
    'belitung': { full: 'Belitung (Pelabuhan Tanjung Pandan)', short: 'Belitung' },
    'sungailiat': { full: 'Sungailiat', short: 'Sungailiat' }
};

const directRoutes = {
    'palembang-pangkalpinang': { price: 70000, ship: 'KM Segara Express 1', duration: '22 jam' },
    'palembang-jakarta': { price: 150000, ship: 'KM Segara Express 1', duration: '35 jam' },
    'pangkalpinang-jakarta': { price: 90000, ship: 'KM Segara Express 1', duration: '29 jam' },
    'jakarta-palembang': { price: 110000, ship: 'KM Segara Express 1', duration: '33 jam' },
    
    'medan-batam': { price: 120000, ship: 'KM Segara Express 2', duration: '25 jam' },
    'batam-tanjungpinang': { price: 20000, ship: 'KM Segara Express 2', duration: '3 jam' },
    'tanjungpinang-kijing': { price: 90000, ship: 'KM Segara Express 2', duration: '20 jam' },
    'kijing-medan': { price: 410000, ship: 'KM Segara Express 2', duration: '47 jam' },
    'medan-tanjungpinang': { price: 120000, ship: 'KM Segara Express 2', duration: '28 jam' },
    'batam-kijing': { price: 100000, ship: 'KM Segara Express 2', duration: '14 jam' },
    'tanjungpinang-medan': { price: 490000, ship: 'KM Segara Express 2', duration: '47 jam' },
    
    'jakarta-pangkalpinang': { price: 60000, ship: 'KM Segara Nusantara', duration: '11 jam' },
    'jakarta-belitung': { price: 80000, ship: 'KM Segara Nusantara', duration: '15 jam' },
    'jakarta-kijing': { price: 130000, ship: 'KM Segara Nusantara', duration: '22 jam' },
    'jakarta-pontianak': { price: 140000, ship: 'KM Segara Nusantara', duration: '19 jam' },
    'pangkalpinang-belitung': { price: 30000, ship: 'KM Segara Nusantara', duration: '4 jam' },
    'pangkalpinang-kijing': { price: 70000, ship: 'KM Segara Nusantara', duration: '9 jam' },
    'pangkalpinang-pontianak': { price: 80000, ship: 'KM Segara Nusantara', duration: '17 jam' },
    'pangkalpinang-jakarta': { price: 170000, ship: 'KM Segara Nusantara', duration: '24 jam' },
    'belitung-kijing': { price: 50000, ship: 'KM Segara Nusantara', duration: '9 jam' },
    'belitung-pontianak': { price: 60000, ship: 'KM Segara Nusantara', duration: '17 jam' },
    'belitung-jakarta': { price: 150000, ship: 'KM Segara Nusantara', duration: '20 jam' },
    'kijing-pontianak': { price: 10000, ship: 'KM Segara Nusantara', duration: '2 jam' },
    'kijing-jakarta': { price: 100000, ship: 'KM Segara Nusantara', duration: '17 jam' },
    'kijing-pangkalpinang': { price: 160000, ship: 'KM Segara Nusantara', duration: '20 jam' },
    'kijing-belitung': { price: 180000, ship: 'KM Segara Nusantara', duration: '20 jam' },
    'pontianak-jakarta': { price: 100000, ship: 'KM Segara Nusantara', duration: '17 jam' },
    'pontianak-pangkalpinang': { price: 150000, ship: 'KM Segara Nusantara', duration: '24 jam' },
    'pontianak-belitung': { price: 170000, ship: 'KM Segara Nusantara', duration: '24 jam' },
    'pontianak-kijing': { price: 210000, ship: 'KM Segara Nusantara', duration: '22 jam' },
    
    'jakarta-palembang-cargo': { price: 300000, ship: 'KM Segara Logistik', duration: '13 jam' },
    'jakarta-pangkalpinang-cargo': { price: 400000, ship: 'KM Segara Logistik', duration: '18 jam' },
    'jakarta-medan-cargo': { price: 860000, ship: 'KM Segara Logistik', duration: '40 jam' },
    'jakarta-batam-cargo': { price: 1130000, ship: 'KM Segara Logistik', duration: '45 jam' },
    'jakarta-kijing-cargo': { price: 1360000, ship: 'KM Segara Logistik', duration: '52 jam' },
    'palembang-pangkalpinang-cargo': { price: 150000, ship: 'KM Segara Logistik', duration: '8 jam' },
    'palembang-medan-cargo': { price: 610000, ship: 'KM Segara Logistik', duration: '30 jam' },
    'palembang-batam-cargo': { price: 870000, ship: 'KM Segara Logistik', duration: '42 jam' },
    'palembang-kijing-cargo': { price: 1110000, ship: 'KM Segara Logistik', duration: '50 jam' },
    'medan-batam-cargo': { price: 270000, ship: 'KM Segara Logistik', duration: '14 jam' },
    'medan-kijing-cargo': { price: 500000, ship: 'KM Segara Logistik', duration: '35 jam' },
    'batam-kijing-cargo': { price: 240000, ship: 'KM Segara Logistik', duration: '12 jam' },
    'kijing-jakarta-cargo': { price: 260000, ship: 'KM Segara Logistik', duration: '17 jam' },
};

const transitRoutes = {
    'jakarta-medan': [
        { via: 'batam', leg1: 'jakarta-batam', leg2: 'batam-medan' },
        { via: 'tanjungpinang', leg1: 'jakarta-tanjungpinang', leg2: 'tanjungpinang-medan' }
    ],
    'medan-jakarta': [
        { via: 'batam', leg1: 'medan-batam', leg2: 'batam-jakarta' },
        { via: 'tanjungpinang', leg1: 'medan-tanjungpinang', leg2: 'tanjungpinang-jakarta' }
    ],
    'palembang-medan': [
        { via: 'jakarta', leg1: 'palembang-jakarta', leg2: 'jakarta-medan' },
        { via: 'batam', leg1: 'palembang-batam', leg2: 'batam-medan' }
    ],
    'palembang-batam': [
        { via: 'jakarta', leg1: 'palembang-jakarta', leg2: 'jakarta-batam' }
    ],
    'palembang-kijing': [
        { via: 'jakarta', leg1: 'palembang-jakarta', leg2: 'jakarta-kijing' },
        { via: 'tanjungpinang', leg1: 'palembang-tanjungpinang', leg2: 'tanjungpinang-kijing' }
    ],
    'belitung-jakarta': [
        { via: 'pangkalpinang', leg1: 'belitung-pangkalpinang', leg2: 'pangkalpinang-jakarta' }
    ],
    'belitung-medan': [
        { via: 'kijing', leg1: 'belitung-kijing', leg2: 'kijing-medan' },
        { via: 'jakarta', leg1: 'belitung-jakarta', leg2: 'jakarta-medan' }
    ]
};

// Generate schedules berdasarkan rute dan tanggal
function generateSchedules(route, type, selectedDate) {
    const key = type === 'kargo' ? `${route}-cargo` : route;
    
    // Cek di admin schedules berdasarkan tanggal
    const adminSchedules = JSON.parse(localStorage.getItem('adminSchedules')) || [];
    const matchingAdminSchedules = adminSchedules.filter(s => {
        const scheduleKey = `${s.asal}-${s.tujuan}`;
        const reverseKey = `${s.tujuan}-${s.asal}`;
        return (scheduleKey === route || reverseKey === route) && 
               s.type === type && 
               s.date === selectedDate;
    });
    
    if (matchingAdminSchedules.length > 0) {
        // Return admin schedules yang sesuai tanggal
        return matchingAdminSchedules.map(schedule => {
            const departDateTime = new Date(`${schedule.date}T${schedule.time}`);
            const arriveDateTime = new Date(departDateTime);
            arriveDateTime.setHours(arriveDateTime.getHours() + schedule.duration);
            
            return {
                id: schedule.id,
                ship: schedule.ship,
                departDate: departDateTime.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }),
                departTime: schedule.time,
                arriveDate: arriveDateTime.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }),
                arriveTime: String(arriveDateTime.getHours()).padStart(2, '0') + ':' + String(arriveDateTime.getMinutes()).padStart(2, '0'),
                duration: `${schedule.duration} jam`,
                price: 'Rp ' + schedule.price.toLocaleString('id-ID'),
                rawPrice: schedule.price,
                type: 'direct'
            };
        });
    }
    
    // Fallback ke directRoutes (data default)
    const routeInfo = directRoutes[key];
    const adminRoute = adminSchedules.find(s => {
        const scheduleKey = type === 'kargo' ? `${s.asal}-${s.tujuan}-cargo` : `${s.asal}-${s.tujuan}`;
        return scheduleKey === key && s.type === type;
    });
    
    let finalRouteInfo = routeInfo;
    if (adminRoute) {
        finalRouteInfo = {
            price: adminRoute.price,
            ship: adminRoute.ship,
            duration: `${adminRoute.duration} jam`
        };
    }
    
    if (!finalRouteInfo) return [];
    
    const schedules = [];
    const searchDate = new Date(selectedDate);
    const baseDate = new Date('2025-11-21');
    
    for (let i = 0; i < 4; i++) {
        const departDate = new Date(baseDate);
        departDate.setDate(baseDate.getDate() + (i * 3));

        if (departDate.toDateString() === searchDate.toDateString()) {
            const arriveDate = new Date(departDate);
            const hoursToAdd = parseInt(finalRouteInfo.duration);
            arriveDate.setHours(arriveDate.getHours() + hoursToAdd);
            
            schedules.push({
                id: `${route}-${i}`,
                ship: finalRouteInfo.ship,
                departDate: departDate.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }),
                departTime: String(departDate.getHours()).padStart(2, '0') + ':00',
                arriveDate: arriveDate.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }),
                arriveTime: String(arriveDate.getHours()).padStart(2, '0') + ':00',
                duration: finalRouteInfo.duration,
                price: 'Rp ' + finalRouteInfo.price.toLocaleString('id-ID'),
                rawPrice: finalRouteInfo.price,
                type: 'direct'
            });
        }
    }
    
    return schedules;
}

// Cari rute transit
function findTransitRoutes(from, to, type) {
    const key = `${from}-${to}`;
    const reverseKey = `${to}-${from}`;
    
    const directKey = type === 'kargo' ? `${key}-cargo` : key;
    const reverseDirectKey = type === 'kargo' ? `${reverseKey}-cargo` : reverseKey;
    
    if (directRoutes[directKey] || directRoutes[reverseDirectKey]) {
        return [];
    }
    
    const transitOptions = transitRoutes[key] || transitRoutes[reverseKey] || [];
    return transitOptions;
}

// Search Schedule Function
function searchSchedule() {
    const activeTab = document.querySelector('.booking-tab.active').textContent;
    
    if (activeTab.includes('Penumpang')) {
        const asal = document.getElementById('pelabuhan-asal').value;
        const tujuan = document.getElementById('pelabuhan-tujuan').value;
        const tanggal = document.getElementById('tanggal-berangkat').value;
        
        if (!asal) {
            alert('⚠️ Pelabuhan asal harus dipilih!');
            return;
        }
        if (!tujuan) {
            alert('⚠️ Pelabuhan tujuan harus dipilih!');
            return;
        }
        if (!tanggal) {
            alert('⚠️ Tanggal keberangkatan harus dipilih!');
            return;
        }
        if (asal === tujuan) {
            alert('⚠️ Pelabuhan asal dan tujuan tidak boleh sama!');
            return;
        }
        
        showSearchResults(asal, tujuan, tanggal, 'penumpang');
    } else {
        const asal = document.getElementById('kargo-asal').value;
        const tujuan = document.getElementById('kargo-tujuan').value;
        const tanggal = document.getElementById('kargo-tanggal').value;
        const container = document.getElementById('jumlah-container').value;
        
        if (!asal) {
            alert('⚠️ Pelabuhan asal harus dipilih!');
            return;
        }
        if (!tujuan) {
            alert('⚠️ Pelabuhan tujuan harus dipilih!');
            return;
        }
        if (!tanggal) {
            alert('⚠️ Tanggal pengiriman harus dipilih!');
            return;
        }
        if (!container) {
            alert('⚠️ Jumlah container harus dipilih!');
            return;
        }
        if (asal === tujuan) {
            alert('⚠️ Pelabuhan asal dan tujuan tidak boleh sama!');
            return;
        }
        
        showSearchResults(asal, tujuan, tanggal, 'kargo');
    }
}

// Show search results
function showSearchResults(asal, tujuan, tanggal, type) {
    const resultsDiv = document.getElementById('searchResults');
    const routeKey = `${asal}-${tujuan}`;
    const reverseKey = `${tujuan}-${asal}`;
    
    let directSchedules = generateSchedules(routeKey, type, tanggal);
    if (directSchedules.length === 0) {
        directSchedules = generateSchedules(reverseKey, type, tanggal);
    }
    
    const transitOptions = findTransitRoutes(asal, tujuan, type);
    let transitSchedules = [];
    
    if (transitOptions.length > 0) {
        transitSchedules = transitOptions.map((option, idx) => {
            const leg1Schedules = generateSchedules(option.leg1, type, tanggal);
            const leg2Schedules = generateSchedules(option.leg2, type, tanggal);
            
            if (leg1Schedules.length > 0 && leg2Schedules.length > 0) {
                return {
                    id: `transit-${idx}`,
                    leg1: leg1Schedules[0],
                    leg2: leg2Schedules[0],
                    via: option.via,
                    type: 'transit',
                    totalPrice: leg1Schedules[0].rawPrice + leg2Schedules[0].rawPrice,
                    totalPriceFormatted: 'Rp ' + (leg1Schedules[0].rawPrice + leg2Schedules[0].rawPrice).toLocaleString('id-ID')
                };
            }
            return null;
        }).filter(s => s !== null);
    }
    
    const allSchedules = [...directSchedules, ...transitSchedules];
    
    if (allSchedules.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <div style="width: 150px; height: 150px; margin: 0 auto 1.5rem; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 4rem; color: #ccc;">✕</span>
                </div>
                <h4>Tidak Ada Jadwal Tersedia</h4>
                <p style="margin-top: 1rem; color: #1e3c72;">Rute: <strong>${ports[asal].short} → ${ports[tujuan].short}</strong></p>
                <p style="margin-top: 0.5rem;">Tanggal: <strong>${new Date(tanggal).toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</strong></p>
                <p style="margin-top: 1.5rem; color: #666;">Saat ini belum ada jadwal untuk rute ini. Silakan coba rute lain atau hubungi call center kami di <strong style="color: #1e3c72;">08111346152</strong> untuk informasi lebih lanjut.</p>
            </div>
        `;
    } else {
        let tableHTML = `
            <div class="result-header">
                <h3>📋 Jadwal Keberangkatan Tersedia</h3>
                <p class="result-route">${ports[asal].short} → ${ports[tujuan].short}</p>
                <p style="color: #666; margin-top: 0.5rem;">
                    ${new Date(tanggal).toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                </p>
            </div>
        `;
        
        const directOnly = allSchedules.filter(s => s.type === 'direct');
        if (directOnly.length > 0) {
            tableHTML += `<h4 style="color: #1e3c72; margin: 1.5rem 0 1rem; font-size: 1.1rem;">🚢 Rute Langsung</h4>
            <table class="schedule-result-table">
                <thead>
                    <tr>
                        <th>Kapal</th>
                        <th>Berangkat</th>
                        <th></th>
                        <th>Sampai</th>
                        <th>Lama</th>
                        <th>Harga</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>`;
            
            directOnly.forEach(schedule => {
                tableHTML += `
                    <tr>
                        <td>
                            <div class="ship-name">${schedule.ship}</div>
                            <div class="ship-class">KELAS 1A</div>
                        </td>
                        <td>
                            <div class="time-info">
                                <div class="time-main">${schedule.departTime}</div>
                                <div class="time-date">${schedule.departDate}</div>
                            </div>
                        </td>
                        <td class="route-arrow">→</td>
                        <td>
                            <div class="time-info">
                                <div class="time-main">${schedule.arriveTime}</div>
                                <div class="time-date">${schedule.arriveDate}</div>
                            </div>
                        </td>
                        <td>
                            <div class="duration-info">${schedule.duration}</div>
                        </td>
                        <td class="price-info">
                            <div class="price-amount">${schedule.price}</div>
                        </td>
                        <td style="text-align: center;">
                            <button class="select-button" onclick="selectSchedule('${schedule.id}', '${asal}', '${tujuan}', '${tanggal}', '${type}', ${schedule.rawPrice}, '${schedule.ship}', '${schedule.departTime}', '${schedule.arriveTime}', '${schedule.duration}')">Pilih</button>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `</tbody></table>`;
        }
        
        const transitOnly = allSchedules.filter(s => s.type === 'transit');
        if (transitOnly.length > 0) {
            tableHTML += `<h4 style="color: #1e3c72; margin: 1.5rem 0 1rem; font-size: 1.1rem;">🔄 Dengan Transit (1 Kali Berhenti)</h4>
            <table class="schedule-result-table">
                <thead>
                    <tr>
                        <th>Rute</th>
                        <th>Berangkat</th>
                        <th></th>
                        <th>Sampai</th>
                        <th>Total Waktu</th>
                        <th>Harga</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>`;
            
            transitOnly.forEach(schedule => {
                const leg1 = schedule.leg1;
                const leg2 = schedule.leg2;
                tableHTML += `
                    <tr>
                        <td>
                            <div class="ship-name">${leg1.ship} → ${leg2.ship}</div>
                            <div class="ship-class">via ${ports[schedule.via].short}</div>
                        </td>
                        <td>
                            <div class="time-info">
                                <div class="time-main">${leg1.departTime}</div>
                                <div class="time-date">${leg1.departDate}</div>
                            </div>
                        </td>
                        <td class="route-arrow">→</td>
                        <td>
                            <div class="time-info">
                                <div class="time-main">${leg2.arriveTime}</div>
                                <div class="time-date">${leg2.arriveDate}</div>
                            </div>
                        </td>
                        <td>
                            <div class="duration-info">${schedule.leg1.duration} + ${schedule.leg2.duration}</div>
                            <div style="color: #999; font-size: 0.85rem;">2 tiket</div>
                        </td>
                        <td class="price-info">
                            <div class="price-amount">${schedule.totalPriceFormatted}</div>
                        </td>
                        <td style="text-align: center;">
                            <button class="select-button" onclick="alert('Fitur pemesanan transit akan segera hadir!')">Pilih</button>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `</tbody></table>`;
        }
        
        resultsDiv.innerHTML = tableHTML;
    }
    
    resultsDiv.classList.add('active');
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// ============================================
// SISTEM BOOKING & PEMESANAN TIKET
// ============================================

// Global variable untuk menyimpan data booking sementara
let tempBookingData = {};

// Select Schedule - ketika user klik tombol "Pilih"
function selectSchedule(scheduleId, asal, tujuan, tanggal, type, price, ship, departTime, arriveTime, duration) {
    // Cek apakah user sudah login
    if (!currentUser) {
        alert('⚠️ Silakan login terlebih dahulu untuk melakukan pemesanan!');
        showAuthModal();
        return;
    }
    
    // Simpan data booking sementara
    tempBookingData = {
        scheduleId: scheduleId,
        asal: asal,
        tujuan: tujuan,
        tanggal: tanggal,
        type: type,
        price: price,
        ship: ship,
        departTime: departTime,
        arriveTime: arriveTime,
        duration: duration
    };
    
    // Tampilkan modal booking
    showBookingModal();
}

// Show Booking Modal
function showBookingModal() {
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('bookingModalBody');
    
    const isPenumpang = tempBookingData.type === 'penumpang';
    
    let formHTML = `
        <div class="alert alert-info">
            <strong>📋 Detail Jadwal:</strong><br>
            • Rute: ${ports[tempBookingData.asal].short} → ${ports[tempBookingData.tujuan].short}<br>
            • Kapal: ${tempBookingData.ship}<br>
            • Tanggal: ${new Date(tempBookingData.tanggal).toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}<br>
            • Keberangkatan: ${tempBookingData.departTime}<br>
            • Estimasi Tiba: ${tempBookingData.arriveTime}<br>
            • Durasi: ${tempBookingData.duration}<br>
            • Harga: Rp ${tempBookingData.price.toLocaleString('id-ID')}
        </div>
        
        <form id="detailBookingForm" onsubmit="submitBooking(event)">
    `;
    
    if (isPenumpang) {
        formHTML += `
            <h4 style="color: #1e3c72; margin: 1.5rem 0 1rem;">👤 Data Penumpang</h4>
            
            <div class="form-group">
                <label>Nama Lengkap *</label>
                <input type="text" id="passengerName" required placeholder="Sesuai KTP/Identitas" value="${currentUser.name}">
            </div>
            
            <div class="form-group">
                <label>Nomor KTP/Identitas *</label>
                <input type="text" id="passengerID" required placeholder="16 digit nomor KTP" maxlength="16" pattern="[0-9]{16}">
            </div>
            
            <div class="form-group">
                <label>Nomor Telepon/WhatsApp *</label>
                <input type="tel" id="passengerPhone" required placeholder="08xxxxxxxxxx">
            </div>
            
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="passengerEmail" required placeholder="email@example.com" value="${currentUser.email}">
            </div>
            
            <div class="form-group">
                <label>Jumlah Penumpang Dewasa *</label>
                <select id="passengerAdult" required onchange="calculateTotal()">
                    <option value="1">1 Orang</option>
                    <option value="2">2 Orang</option>
                    <option value="3">3 Orang</option>
                    <option value="4">4 Orang</option>
                    <option value="5">5 Orang</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Jumlah Anak (3-12 tahun) - Diskon 50%</label>
                <select id="passengerChild" onchange="calculateTotal()">
                    <option value="0">0 Anak</option>
                    <option value="1">1 Anak</option>
                    <option value="2">2 Anak</option>
                    <option value="3">3 Anak</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Jumlah Bayi (0-3 tahun) - Gratis</label>
                <select id="passengerBaby">
                    <option value="0">0 Bayi</option>
                    <option value="1">1 Bayi</option>
                    <option value="2">2 Bayi</option>
                </select>
            </div>
            
            <div class="alert alert-warning" style="margin-top: 1.5rem;">
                <strong>⚠️ Catatan Penting:</strong><br>
                • Bawa KTP/identitas asli saat check-in<br>
                • Check-in minimal 1 jam sebelum keberangkatan<br>
                • Bagasi gratis 20kg per penumpang
            </div>
        `;
    } else {
        formHTML += `
            <h4 style="color: #1e3c72; margin: 1.5rem 0 1rem;">📦 Data Pengirim</h4>
            
            <div class="form-group">
                <label>Nama Perusahaan/Pengirim *</label>
                <input type="text" id="senderName" required placeholder="Nama perusahaan atau individu">
            </div>
            
            <div class="form-group">
                <label>Nomor Telepon/WhatsApp *</label>
                <input type="tel" id="senderPhone" required placeholder="08xxxxxxxxxx">
            </div>
            
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="senderEmail" required placeholder="email@example.com" value="${currentUser.email}">
            </div>
            
            <div class="form-group">
                <label>Alamat Lengkap *</label>
                <textarea id="senderAddress" required rows="3" placeholder="Alamat lengkap pengirim"></textarea>
            </div>
            
            <h4 style="color: #1e3c72; margin: 1.5rem 0 1rem;">📦 Data Penerima</h4>
            
            <div class="form-group">
                <label>Nama Penerima *</label>
                <input type="text" id="receiverName" required placeholder="Nama penerima">
            </div>
            
            <div class="form-group">
                <label>Nomor Telepon Penerima *</label>
                <input type="tel" id="receiverPhone" required placeholder="08xxxxxxxxxx">
            </div>
            
            <div class="form-group">
                <label>Alamat Penerima *</label>
                <textarea id="receiverAddress" required rows="3" placeholder="Alamat lengkap penerima"></textarea>
            </div>
            
            <h4 style="color: #1e3c72; margin: 1.5rem 0 1rem;">📦 Detail Kargo</h4>
            
            <div class="form-group">
                <label>Jenis Barang *</label>
                <input type="text" id="cargoType" required placeholder="Contoh: Elektronik, Makanan, dll">
            </div>
            
            <div class="form-group">
                <label>Jumlah Container *</label>
                <select id="cargoContainer" required onchange="calculateTotal()">
                    <option value="1">1 Container</option>
                    <option value="2">2 Container</option>
                    <option value="3">3 Container</option>
                    <option value="4">4 Container</option>
                    <option value="5">5 Container</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Berat Estimasi (Ton)</label>
                <input type="number" id="cargoWeight" placeholder="Estimasi berat dalam ton" min="0.1" step="0.1">
            </div>
            
            <div class="alert alert-warning" style="margin-top: 1.5rem;">
                <strong>⚠️ Catatan Penting:</strong><br>
                • Pastikan barang dikemas dengan aman<br>
                • Barang berbahaya tidak diperkenankan<br>
                • Tracking number akan dikirim via email
            </div>
        `;
    }
    
    formHTML += `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 1.5rem;">
                <h4 style="color: #1e3c72; margin-bottom: 0.5rem;">💰 Total Pembayaran</h4>
                <div id="totalPrice" style="font-size: 1.5rem; font-weight: bold; color: #28a745;">
                    Rp ${tempBookingData.price.toLocaleString('id-ID')}
                </div>
            </div>
            
            <div class="form-group" style="margin-top: 1.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="agreeTerm" required>
                    <span>Saya setuju dengan <a href="#" style="color: #1e3c72; text-decoration: underline;">syarat dan ketentuan</a> yang berlaku</span>
                </label>
            </div>
            
            <button type="submit" class="submit-btn" style="margin-top: 1rem;">
                ✅ Konfirmasi Pemesanan
            </button>
        </form>
    `;
    
    modalBody.innerHTML = formHTML;
    modal.classList.add('show');
}

// Close Booking Modal
function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('show');
    tempBookingData = {};
}

// Calculate Total (untuk penumpang dengan diskon anak)
function calculateTotal() {
    if (tempBookingData.type === 'penumpang') {
        const adults = parseInt(document.getElementById('passengerAdult').value) || 0;
        const children = parseInt(document.getElementById('passengerChild').value) || 0;
        
        const basePrice = tempBookingData.price;
        const childPrice = basePrice * 0.5; // Diskon 50% untuk anak
        
        const total = (adults * basePrice) + (children * childPrice);
        
        document.getElementById('totalPrice').innerHTML = `Rp ${total.toLocaleString('id-ID')}`;
        tempBookingData.totalPrice = total;
    } else if (tempBookingData.type === 'kargo') {
        const containers = parseInt(document.getElementById('cargoContainer').value) || 1;
        const total = tempBookingData.price * containers;
        
        document.getElementById('totalPrice').innerHTML = `Rp ${total.toLocaleString('id-ID')}`;
        tempBookingData.totalPrice = total;
    }
}

// Submit Booking
function submitBooking(event) {
    event.preventDefault();
    
    // Generate booking code
    const bookingCode = 'SU' + Date.now().toString().substring(5);
    
    // Kumpulkan data booking
    let bookingData = {
        bookingCode: bookingCode,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        scheduleId: tempBookingData.scheduleId,
        asal: tempBookingData.asal,
        tujuan: tempBookingData.tujuan,
        tanggal: tempBookingData.tanggal,
        ship: tempBookingData.ship,
        departTime: tempBookingData.departTime,
        arriveTime: tempBookingData.arriveTime,
        duration: tempBookingData.duration,
        type: tempBookingData.type,
        basePrice: tempBookingData.price,
        totalPrice: tempBookingData.totalPrice || tempBookingData.price,
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
    };
    
    if (tempBookingData.type === 'penumpang') {
        bookingData.passengerName = document.getElementById('passengerName').value;
        bookingData.passengerID = document.getElementById('passengerID').value;
        bookingData.passengerPhone = document.getElementById('passengerPhone').value;
        bookingData.passengerEmail = document.getElementById('passengerEmail').value;
        bookingData.adultCount = parseInt(document.getElementById('passengerAdult').value);
        bookingData.childCount = parseInt(document.getElementById('passengerChild').value);
        bookingData.babyCount = parseInt(document.getElementById('passengerBaby').value);
    } else {
        bookingData.senderName = document.getElementById('senderName').value;
        bookingData.senderPhone = document.getElementById('senderPhone').value;
        bookingData.senderEmail = document.getElementById('senderEmail').value;
        bookingData.senderAddress = document.getElementById('senderAddress').value;
        bookingData.receiverName = document.getElementById('receiverName').value;
        bookingData.receiverPhone = document.getElementById('receiverPhone').value;
        bookingData.receiverAddress = document.getElementById('receiverAddress').value;
        bookingData.cargoType = document.getElementById('cargoType').value;
        bookingData.containerCount = parseInt(document.getElementById('cargoContainer').value);
        bookingData.cargoWeight = document.getElementById('cargoWeight').value || 'N/A';
    }
    
    // Simpan ke localStorage
    const bookings = JSON.parse(localStorage.getItem('bookings')) || [];
    bookings.push(bookingData);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    
    // Tutup booking modal
    closeBookingModal();
    
    // Kirim email
    sendBookingEmail(bookingData);
    
    // Tampilkan success modal
    showSuccessModal(bookingCode);
}

// Send Booking Email
function sendBookingEmail(bookingData) {
    const isPenumpang = bookingData.type === 'penumpang';
    
    let emailBody = `
========================================
KONFIRMASI PEMESANAN TIKET
PT SEGARA UTAMA
========================================

KODE BOOKING: ${bookingData.bookingCode}

========================================
DETAIL PERJALANAN
========================================
Jenis: ${isPenumpang ? 'Penumpang' : 'Kargo'}
Rute: ${ports[bookingData.asal].short.toUpperCase()} → ${ports[bookingData.tujuan].short.toUpperCase()}
Tanggal: ${new Date(bookingData.tanggal).toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
Kapal: ${bookingData.ship}
Jam Keberangkatan: ${bookingData.departTime}
Estimasi Tiba: ${bookingData.arriveTime}
Durasi Perjalanan: ${bookingData.duration}

========================================
${isPenumpang ? 'DATA PENUMPANG' : 'DATA PENGIRIM & PENERIMA'}
========================================`;

    if (isPenumpang) {
        emailBody += `
Nama: ${bookingData.passengerName}
No. KTP: ${bookingData.passengerID}
Telepon: ${bookingData.passengerPhone}
Email: ${bookingData.passengerEmail}

Jumlah Penumpang:
- Dewasa: ${bookingData.adultCount} orang
- Anak (3-12 tahun): ${bookingData.childCount} orang
- Bayi (0-3 tahun): ${bookingData.babyCount} orang`;
    } else {
        emailBody += `
PENGIRIM:
Nama: ${bookingData.senderName}
Telepon: ${bookingData.senderPhone}
Email: ${bookingData.senderEmail}
Alamat: ${bookingData.senderAddress}

PENERIMA:
Nama: ${bookingData.receiverName}
Telepon: ${bookingData.receiverPhone}
Alamat: ${bookingData.receiverAddress}

DETAIL KARGO:
Jenis Barang: ${bookingData.cargoType}
Jumlah Container: ${bookingData.containerCount}
Berat Estimasi: ${bookingData.cargoWeight} Ton`;
    }

    emailBody += `

========================================
INFORMASI PEMBAYARAN
========================================
Harga per ${isPenumpang ? 'Penumpang Dewasa' : 'Container'}: Rp ${bookingData.basePrice.toLocaleString('id-ID')}
Total Pembayaran: Rp ${bookingData.totalPrice.toLocaleString('id-ID')}

Metode Pembayaran:
Silakan transfer ke rekening berikut:
- Bank BCA: 1234567890 a.n. PT Segara Utama
- Bank Mandiri: 0987654321 a.n. PT Segara Utama

========================================
INSTRUKSI PENTING
========================================
1. Simpan kode booking: ${bookingData.bookingCode}
2. ${isPenumpang ? 'Datang minimal 1 jam sebelum keberangkatan' : 'Barang harus tiba di pelabuhan H-1'}
3. ${isPenumpang ? 'Bawa KTP/identitas asli saat check-in' : 'Sertakan dokumen pengiriman yang lengkap'}
4. ${isPenumpang ? 'Bagasi gratis 20kg per penumpang' : 'Pastikan barang dikemas dengan aman'}
5. Konfirmasi pembayaran ke WhatsApp: 08111346152

========================================
KEBIJAKAN PEMBATALAN
========================================
- H-7 atau lebih: Refund 90%
- H-3 s/d H-6: Refund 70%
- H-1 s/d H-2: Refund 50%
- H-0: Tidak dapat refund

========================================
HUBUNGI KAMI
========================================
Call Center: 08111346152
Email: bernard_yoe@tomang.ipeka.sch.id
Website: www.segarautama.co.id

Terima kasih telah memilih PT Segara Utama!
Selamat Berlayar! ⚓

---
Email ini dikirim otomatis. Jangan balas email ini.
    `;
    
    // Buat mailto link
    const recipientEmail = isPenumpang ? bookingData.passengerEmail : bookingData.senderEmail;
    const subject = `[PT Segara Utama] Konfirmasi Booking ${bookingData.bookingCode}`;
    
    const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Buka email client
    window.location.href = mailtoLink;
}

// Show Success Modal
function showSuccessModal(bookingCode) {
    const modal = document.getElementById('successModal');
    document.getElementById('bookingCodeDisplay').textContent = bookingCode;
    modal.classList.add('show');
}

// Close Success Modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('show');
    
    // Reset search results
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('searchResults').innerHTML = '';
}

// ============================================
// SISTEM ADMIN PANEL
// ============================================

// Load Admin Schedules
function loadAdminSchedules() {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;
    
    const schedules = JSON.parse(localStorage.getItem('adminSchedules')) || [];
    
    if (schedules.length === 0) {
        scheduleList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.1rem;">Belum ada jadwal yang ditambahkan</p>
                <p style="margin-top: 0.5rem;">Gunakan form di atas untuk menambah jadwal baru</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    schedules.forEach((schedule, index) => {
        const badge = schedule.type === 'penumpang' ? 
            '<span class="route-type-badge badge-penumpang">PENUMPANG</span>' :
            '<span class="route-type-badge badge-kargo">KARGO</span>';
        
        html += `
            <div class="schedule-item">
                <div class="schedule-info">
                    <div>
                        <strong style="color: #1e3c72;">Rute:</strong><br>
                        ${schedule.asal.toUpperCase()} → ${schedule.tujuan.toUpperCase()}
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Kapal:</strong><br>
                        ${schedule.ship}
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Harga:</strong><br>
                        Rp ${schedule.price.toLocaleString('id-ID')}
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Durasi:</strong><br>
                        ${schedule.duration} jam
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Tipe:</strong><br>
                        ${badge}
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Tanggal:</strong><br>
                        ${new Date(schedule.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </div>
                    <div>
                        <strong style="color: #1e3c72;">Jam:</strong><br>
                        ${schedule.time}
                    </div>
                </div>
                <div class="schedule-actions">
                    <button class="edit-btn" onclick="editSchedule(${index})">✏️ Edit</button>
                    <button class="delete-btn" onclick="deleteSchedule(${index})">🗑️ Hapus</button>
                </div>
            </div>
        `;
    });
    
    scheduleList.innerHTML = html;
}

// Add Schedule
function addSchedule() {
    // Cek apakah user adalah admin
    if (!currentUser || currentUser.role !== 'admin') {
        alert('⚠️ Hanya admin yang dapat menambah jadwal!');
        return;
    }
    
    const asal = document.getElementById('admin-asal').value;
    const tujuan = document.getElementById('admin-tujuan').value;
    const ship = document.getElementById('admin-ship').value;
    const price = parseInt(document.getElementById('admin-price').value);
    const duration = parseInt(document.getElementById('admin-duration').value);
    const type = document.getElementById('admin-type').value;
    const date = document.getElementById('admin-date').value;
    const time = document.getElementById('admin-time').value;
    
    // Validasi tambahan
    if (!date || !time) {
        alert('⚠️ Tanggal dan jam keberangkatan harus diisi!');
        return;
    }
    
    // Validasi
    if (!asal || !tujuan || !ship || !price || !duration) {
        alert('⚠️ Semua field harus diisi!');
        return;
    }
    
    if (asal === tujuan) {
        alert('⚠️ Pelabuhan asal dan tujuan tidak boleh sama!');
        return;
    }
    
    // Buat objek schedule baru
    const newSchedule = {
        id: Date.now().toString(),
        asal: asal,
        tujuan: tujuan,
        ship: ship,
        price: price,
        duration: duration,
        type: type,
        date: date,              // TAMBAHAN
        time: time,              // TAMBAHAN
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    // Ambil schedules dari localStorage
    const schedules = JSON.parse(localStorage.getItem('adminSchedules')) || [];
    
    // Cek apakah sedang edit (jika ada ID yang sama, replace)
    const existingIndex = schedules.findIndex(s => 
        s.asal === asal && s.tujuan === tujuan && s.type === type && s.date === date
    );
    
    if (existingIndex >= 0) {
        // Update existing
        schedules[existingIndex] = newSchedule;
        alert('✅ Jadwal berhasil diupdate!');
    } else {
        // Add new
        schedules.push(newSchedule);
        alert('✅ Jadwal berhasil ditambahkan!');
    }
    
    // Simpan ke localStorage
    localStorage.setItem('adminSchedules', JSON.stringify(schedules));
    
    // Reload list
    loadAdminSchedules();
    
    // Reset form
    document.getElementById('admin-asal').value = '';
    document.getElementById('admin-tujuan').value = '';
    document.getElementById('admin-ship').value = '';
    document.getElementById('admin-price').value = '';
    document.getElementById('admin-duration').value = '';
    document.getElementById('admin-type').value = 'penumpang';
    document.getElementById('admin-date').value = '';
    document.getElementById('admin-time').value = '08:00';
}

// Edit Schedule
function editSchedule(index) {
    const schedules = JSON.parse(localStorage.getItem('adminSchedules')) || [];
    const schedule = schedules[index];
    
    if (!schedule) return;
    
    // Isi form dengan data schedule
    document.getElementById('admin-asal').value = schedule.asal;
    document.getElementById('admin-tujuan').value = schedule.tujuan;
    document.getElementById('admin-ship').value = schedule.ship;
    document.getElementById('admin-price').value = schedule.price;
    document.getElementById('admin-duration').value = schedule.duration;
    document.getElementById('admin-type').value = schedule.type;
    document.getElementById('admin-date').value = schedule.date;
    document.getElementById('admin-time').value = schedule.time;
    
    // Scroll ke form
    document.getElementById('admin-asal').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    alert('📝 Data jadwal telah dimuat ke form. Silakan ubah dan klik "Tambah Jadwal" untuk menyimpan perubahan.');
}

// Delete Schedule
function deleteSchedule(index) {
    if (!confirm('⚠️ Apakah Anda yakin ingin menghapus jadwal ini?')) {
        return;
    }
    
    const schedules = JSON.parse(localStorage.getItem('adminSchedules')) || [];
    schedules.splice(index, 1);
    localStorage.setItem('adminSchedules', JSON.stringify(schedules));
    
    loadAdminSchedules();
    alert('✅ Jadwal berhasil dihapus!');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Switch Tab (Penumpang/Kargo)
function switchTab(type) {
    const tabs = document.querySelectorAll('.booking-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    if (type === 'penumpang') {
        tabs[0].classList.add('active');
        document.getElementById('bookingFormPenumpang').style.display = 'grid';
        document.getElementById('bookingFormKargo').style.display = 'none';
    } else {
        tabs[1].classList.add('active');
        document.getElementById('bookingFormPenumpang').style.display = 'none';
        document.getElementById('bookingFormKargo').style.display = 'grid';
    }
}

// Show Section
function showSection(sectionName) {
    // Cek akses admin panel
    if (sectionName === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
            alert('⚠️ Hanya admin yang dapat mengakses halaman ini!');
            return;
        }
    }
    
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(sectionName).classList.add('active');

    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Set active link
    event.target.classList.add('active');

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Contact Form Handler
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const phone = document.getElementById('contactPhone').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    
    const mailtoLink = 'mailto:bernard_yoe@tomang.ipeka.sch.id' +
        '?subject=' + encodeURIComponent('PT Segara Utama - ' + subject) +
        '&body=' + encodeURIComponent(
            'Nama: ' + name + '\n' +
            'Email: ' + email + '\n' +
            'Telepon: ' + phone + '\n\n' +
            'Pesan:\n' + message
        );
    
    window.location.href = mailtoLink;
    
    alert('Terima kasih! Form kontak akan dibuka di aplikasi email Anda.\n\nTim PT Segara Utama akan menghubungi Anda dalam 1x24 jam.');
    
    document.getElementById('contactForm').reset();
});

// Animation Observer
function setupAnimationObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.service-card, .fleet-card, .profile-card, .contact-item, .booking-method');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}