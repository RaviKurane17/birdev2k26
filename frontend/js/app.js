let surnamesList = [];
let currentFolder = '';
let isAdmin = false;

const app = {
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadInitialData();

        // Close search dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('search-results-dropdown');
            const searchContainer = document.querySelector('.search-container');
            if (dropdown && searchContainer && !searchContainer.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    },

    async loadInitialData() {
        await this.fetchSurnames();
        await this.loadNewsTicker();
        await this.loadCommitteeData();
        await this.loadScannerImage();
        this.loadHomeData();
        this.loadPaidDonorsHome();
        this.loadSpecialDonorsHome();
        this.renderHomeSurnames();
    },

    checkAuth() {
        const token = localStorage.getItem('adminToken');
        const logoutBtn = document.getElementById('logout-btn');
        if (token) {
            isAdmin = true;
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            isAdmin = false;
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    },

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.showView(view);

                // Update active state
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Load specific view data
                if (view === 'dashboard') this.loadDashboardData();
                if (view === 'home') {
                    this.loadHomeData();
                    this.loadPaidDonorsHome();
                    this.loadSpecialDonorsHome();
                }
                if (view === 'pending') this.loadPendingData();
                if (view === 'donate') this.populateDonateSelect();
            });
        });

        // Mobile menu toggle – bind ALL possible toggle buttons
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        document.querySelectorAll('.mobile-menu-toggle, .menu-toggle, #mobile-menu-toggle, #menu-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                sidebar.classList.add('open');
                if (overlay) overlay.classList.add('active');
            });
        });

        // Admin Login
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('admin-username').value;
            const p = document.getElementById('admin-password').value;
            try {
                await window.api.login(u, p);
                window.location.href = 'admin.html'; // Redirect to new Admin Dashboard
            } catch (err) {
                const el = document.getElementById('login-error');
                el.innerText = err.message;
                el.style.display = 'block';
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            this.checkAuth();
            this.showView('home');
        });

        // Secret Admin Trigger
        let clickCount = 0;
        let clickTimer;
        const triggerEl = document.getElementById('secret-admin-trigger');
        if (triggerEl) {
            triggerEl.addEventListener('click', () => {
                clickCount++;
                if (clickCount >= 5) {
                    clickCount = 0;
                    this.showView('admin-login');
                }
                clearTimeout(clickTimer);
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 2000); // Reset click count after 2 seconds
            });
        }
    },

    showView(viewId) {
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        const el = document.getElementById(`view-${viewId}`);
        if (el) el.classList.add('active');

        this.closeSidebar();
    },

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    },

    async fetchSurnames() {
        try {
            const data = await window.api.getSurnames();
            surnamesList = data; // Array of objects {id, name}
            this.renderSurnames();
            this.renderAdminSurnames();
        } catch (err) {
            console.error(err);
        }
    },

    renderSurnames() {
        const container = document.getElementById('surnames-container');
        if (!container) return;
        container.innerHTML = surnamesList.map((s, index) =>
            `<div class="surname-btn" onclick="app.openFolder('${s.name}')">
                ${index + 1}. ${s.name}
            </div>`
        ).join('');
    },

    renderHomeSurnames() {
        const container = document.getElementById('home-surnames-grid');
        if (!container) return;
        container.innerHTML = surnamesList.map((s, index) =>
            `<div class="surname-btn" onclick="app.showView('surnames'); app.openFolder('${s.name}')">
                ${index + 1}. ${s.name}
            </div>`
        ).join('');
    },

    async loadNewsTicker() {
        try {
            const news = await window.api.getSetting('newsTicker');
            if (news && news.value) {
                document.getElementById('news-ticker-text').innerHTML = `<span><i class="fa-solid fa-bell"></i> ${news.value}</span>`;
            }

            const banner = await window.api.getSetting('bannerImage');
            if (banner && banner.value) {
                const img = document.getElementById('home-banner-image');
                if (img) {
                    img.src = banner.value;
                    document.getElementById('home-banner-container').style.display = 'block';
                }
            } else {
                if (document.getElementById('home-banner-container')) {
                    document.getElementById('home-banner-container').style.display = 'none';
                }
            }
        } catch (err) {
            console.error(err);
        }
    },

    async loadScannerImage() {
        try {
            const scanner = await window.api.getSetting('scannerImage');
            const scannerImg = document.getElementById('scanner-qr-image');
            const publicLink = document.getElementById('public-scanner-link');
            if (scanner && scanner.value && scannerImg) {
                scannerImg.src = scanner.value;
                if (publicLink) publicLink.href = scanner.value;
                scannerImg.onerror = function () {
                    this.src = 'images/qr.webp';
                    if (publicLink) publicLink.href = 'images/qr.webp';
                    this.onerror = function () { this.src = 'https://via.placeholder.com/200?text=Scan+to+Pay'; };
                };
            }

            // Load UPI ID
            const upiId = await window.api.getSetting('upiId');
            if (upiId && upiId.value) {
                const publicUpi = document.getElementById('public-upi-id');
                const homeUpi = document.getElementById('home-upi-id');
                if (publicUpi) publicUpi.value = upiId.value;
                if (homeUpi) homeUpi.value = upiId.value;
            }
        } catch (err) {
            console.error(err);
        }
    },

    async loadCommitteeData() {
        try {
            const committee = await window.api.getCommittee();
            const html = committee.map(c => `
                <div class="member-card">
                    <div class="avatar"><img src="${c.photoUrl || 'https://api.dicebear.com/6.x/avataaars/svg?seed=' + c.name}" alt="${c.role}" onerror="this.onerror=null; this.src='https://api.dicebear.com/6.x/avataaars/svg?seed=${c.name}'"></div>
                    <h4>${c.role}</h4>
                    <p>${c.name}</p>
                </div>
            `).join('');

            if (document.getElementById('home-committee-grid')) document.getElementById('home-committee-grid').innerHTML = html;
            if (document.getElementById('page-committee-grid')) document.getElementById('page-committee-grid').innerHTML = html;
            if (document.getElementById('admin-committee-list')) document.getElementById('admin-committee-list').innerHTML = html;
        } catch (err) {
            console.error(err);
        }
    },

    async loadHomeData() {
        try {
            const stats = await window.api.getStats();
            document.getElementById('home-total-collected').innerText = `₹ ${stats.totalCollected}`;
            document.getElementById('home-total-collected-large').innerText = `₹ ${stats.totalCollected}`;
            document.getElementById('home-total-pending').innerText = `₹ ${stats.totalPending}`;

            const donations = await window.api.getDonations();
            const totalPeople = donations.length;
            const paidPeople = donations.filter(d => d.isPaid).length;
            const unpaidPeople = totalPeople - paidPeople;

            document.getElementById('home-total-people').innerText = totalPeople;
            document.getElementById('home-paid-people').innerText = paidPeople;
            document.getElementById('home-unpaid-people').innerText = unpaidPeople;

            // Load Previous Balance for Home
            const previous = await window.api.getPreviousDonations();
            const prevTotal = previous.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            const prevElHome = document.getElementById('home-previous-balance');
            if (prevElHome) prevElHome.innerText = `₹ ${prevTotal}`;
        } catch (err) {
            console.error('Error loading home data:', err);
        }
    },

    // --- PAID DONORS ON HOME PAGE ---
    async loadPaidDonorsHome() {
        const container = document.getElementById('home-paid-donors-list');
        if (!container) return;

        try {
            const donations = await window.api.getDonations();
            const paidDonors = donations.filter(d => d.isPaid);

            if (paidDonors.length === 0) {
                container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 1rem;">अजून कोणीही देणगी दिलेली नाही.</p>';
                return;
            }

            container.innerHTML = paidDonors.map(d => `
                <div class="paid-donor-item">
                    <div class="paid-donor-avatar">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div class="paid-donor-info">
                        <h4>${d.name}</h4>
                        <span class="paid-donor-surname">${d.surnameCategory}</span>
                    </div>
                    <div class="paid-donor-amount">₹ ${d.amount}</div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading paid donors:', err);
        }
    },

    // --- SPECIAL DONORS ON HOME PAGE (विशेष सहकार्य) ---
    async loadSpecialDonorsHome() {
        const container = document.getElementById('home-special-donors-list');
        if (!container) return;

        try {
            const allDonors = await window.api.getSpecialDonors();
            const donors = allDonors.filter(d => d.isApproved || d.isApproved === undefined); // assume old records without flag are approved

            if (donors.length === 0) {
                container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 1rem;">अजून विशेष सहकार्य जोडलेले नाही.</p>';
                return;
            }

            container.innerHTML = donors.map(d => `
                <div class="special-donor-card-home">
                    <div class="special-donor-icon-home">
                        <i class="fa-solid fa-hand-holding-heart"></i>
                    </div>
                    <div class="special-donor-details-home">
                        <h4>${d.name}</h4>
                        ${d.amount > 0 ? `<span class="special-donor-amount">₹ ${d.amount}</span>` : ''}
                        ${d.description ? `<p class="special-donor-desc">${d.description}</p>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading special donors:', err);
        }
    },

    async openFolder(surname) {
        currentFolder = surname;
        document.getElementById('folder-title').innerText = surname;
        this.showView('surname-folder');

        // Admin Add Form is hidden on public site, only in admin.html now
        const addForm = document.getElementById('admin-add-donation');
        if (addForm) addForm.style.display = 'none';

        await this.loadFolderDonations(surname);
    },

    async loadFolderDonations(surname) {
        const container = document.getElementById('donors-list-container');
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        try {
            const donations = await window.api.getDonations();
            const filtered = donations.filter(d => d.surnameCategory === surname);

            // Sort: Paid first, then unpaid
            filtered.sort((a, b) => b.isPaid - a.isPaid);

            if (filtered.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">कोणतीही माहिती उपलब्ध नाही. (No records found)</p>';
                return;
            }

            container.innerHTML = filtered.map(d => `
                <div class="donor-card ${d.isPaid ? 'paid' : 'unpaid'}" onclick="this.classList.toggle('expanded')">
                    <div class="donor-card-header">
                        <div class="donor-info">
                            <h4>${d.name}</h4>
                            <span class="amount">₹ ${d.amount}</span>
                        </div>
                        <div class="donor-status" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            ${d.isPaid
                    ? `<div class="status-badge paid">Paid - ${new Date(d.date).toLocaleDateString()}</div>
                                   <button class="btn-receipt" onclick="event.stopPropagation(); app.generateReceipt('${d.name.replace(/'/g, "\\'")}', ${d.amount}, '${d.date}', '${(d.surnameCategory || '').replace(/'/g, "\\'")}', '${(d.paymentMode || 'Cash').replace(/'/g, "\\'")}')" title="Download Receipt"><i class="fa-solid fa-file-invoice"></i> पावती</button>`
                    : `<div class="status-badge unpaid">Not Paid</div>`
                }
                        </div>
                    </div>
                    
                    <div class="donor-details" onclick="event.stopPropagation()">
                        <p><strong>कार्यक्रम (Event Type):</strong> ${d.eventName || 'बिरदेव जयंती २०२४'}</p>
                        <p><strong>पेमेंट पद्धत (Payment Option):</strong> ${d.paymentMode || (d.isPaid ? 'Cash' : 'N/A')}</p>
                        <p><strong>रक्कम (Amount):</strong> ₹ ${d.amount}</p>
                        ${d.isPaid ? `<p><strong>तारीख (Date):</strong> ${new Date(d.date).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error(err);
            container.innerHTML = '<p>Error loading records.</p>';
        }
    },

    async addDonation() {
        const name = document.getElementById('new-donor-name').value;
        const amount = document.getElementById('new-donor-amount').value;
        const eventName = document.getElementById('new-donor-event') ? document.getElementById('new-donor-event').value : 'बिरदेव जयंती २०२४';

        if (!name || !amount) return alert('Please enter name and amount');

        try {
            await window.api.addDonation({ name, amount, surnameCategory: currentFolder, eventName });
            document.getElementById('new-donor-name').value = '';
            document.getElementById('new-donor-amount').value = '';
            if (document.getElementById('new-donor-event')) document.getElementById('new-donor-event').value = 'बिरदेव जयंती २०२४';
            this.loadFolderDonations(currentFolder);
            this.loadHomeData(); // Update stats
        } catch (err) {
            alert('Error adding: ' + err.message);
        }
    },

    async markAsPaid(id) {
        const mode = prompt("Payment Mode (Cash/Online):", "Cash");
        if (!mode) return;
        try {
            await window.api.updateDonation(id, {
                isPaid: true,
                paymentMode: mode,
                date: new Date().toISOString().split('T')[0]
            });
            this.loadFolderDonations(currentFolder);
            this.loadHomeData();
        } catch (err) {
            alert('Error updating: ' + err.message);
        }
    },

    async loadDashboardData() {
        try {
            const stats = await window.api.getStats();
            document.getElementById('dash-collected').innerText = `₹ ${stats.totalCollected}`;
            document.getElementById('dash-expenses').innerText = `₹ ${stats.totalExpenses}`;
            document.getElementById('dash-balance').innerText = `₹ ${stats.remainingBalance}`;

            const previous = await window.api.getPreviousDonations();
            const prevTotal = previous.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            const prevEl = document.getElementById('dash-previous');
            if (prevEl) prevEl.innerText = `₹ ${prevTotal}`;

            document.getElementById('admin-expenses-section').style.display = 'none';

            const expenses = await window.api.getExpenses();
            const tbody = document.getElementById('expenses-table-body');
            tbody.innerHTML = expenses.map(e => `
                <tr>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td>${e.description}</td>
                    <td>₹ ${e.amount}</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error(err);
        }
    },

    async addExpense() {
        const desc = document.getElementById('new-expense-desc').value;
        const amount = document.getElementById('new-expense-amount').value;
        const date = document.getElementById('new-expense-date').value;

        if (!desc || !amount || !date) return alert('Please fill all fields');

        try {
            await window.api.addExpense({ description: desc, amount, date });
            this.loadDashboardData(); // reload
        } catch (err) {
            alert('Error adding expense: ' + err.message);
        }
    },

    // --- NEW PUBLIC & ADMIN FEATURES ---

    populateDonateSelect() {
        const select = document.getElementById('public-donor-surname');
        select.innerHTML = '<option value="">निवडा (Select Surname)</option>' +
            surnamesList.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    },

    async submitPublicDonation() {
        const name = document.getElementById('public-donor-name').value;
        const amount = document.getElementById('public-donor-amount').value;
        const surnameCategory = document.getElementById('public-donor-surname').value;
        const eventName = document.getElementById('public-donor-event') ? document.getElementById('public-donor-event').value : 'बिरदेव जयंती २०२४';

        if (!name || !amount || !surnameCategory) return alert('Please fill all fields.');

        try {
            await window.api.addDonation({ name, amount, surnameCategory, eventName });
            alert('Your pledge has been successfully recorded! Admin will verify the payment soon.');
            document.getElementById('public-donor-name').value = '';
            document.getElementById('public-donor-amount').value = '';
            document.getElementById('public-donor-surname').value = '';
            this.showView('home');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    async loadPendingData() {
        const container = document.getElementById('pending-list-container');
        container.innerHTML = '<p>Loading pending approvals...</p>';
        try {
            const donations = await window.api.getDonations();
            const pending = donations.filter(d => !d.isPaid);

            if (pending.length === 0) {
                container.innerHTML = '<p>No pending approvals. All good!</p>';
                return;
            }

            container.innerHTML = pending.map(d => `
                <div class="donor-card unpaid">
                    <div class="donor-info">
                        <h4>${d.name} <span style="font-size: 0.8rem; color: #718096;">(${d.surnameCategory})</span></h4>
                        <span class="amount">₹ ${d.amount}</span>
                    </div>
                    <div class="admin-actions-cell" style="display:flex; gap:0.5rem;">
                        <button class="btn btn-success" onclick="app.markAsPaid(${d.id})">Approve & Mark Paid</button>
                        <button class="btn btn-danger" onclick="app.deleteDonation(${d.id})">Delete</button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            container.innerHTML = '<p>Error loading records.</p>';
        }
    },

    async deleteDonation(id) {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await window.api.deleteDonation(id);
            if (document.getElementById('view-surname-folder').classList.contains('active')) {
                this.loadFolderDonations(currentFolder);
            }
            if (document.getElementById('view-pending').classList.contains('active')) {
                this.loadPendingData();
            }
            this.loadHomeData();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    },

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await window.api.deleteExpense(id);
            this.loadDashboardData();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    },

    // --- ADMIN SETTINGS FUNCTIONS ---
    async updateNews() {
        const value = document.getElementById('admin-news-input').value;
        try {
            await window.api.updateSetting('newsTicker', value);
            alert('News updated successfully!');
            this.loadNewsTicker();
        } catch (err) {
            alert('Error updating news: ' + err.message);
        }
    },

    async addSurname() {
        const name = document.getElementById('admin-new-surname').value;
        if (!name) return;
        try {
            await window.api.addSurname(name);
            document.getElementById('admin-new-surname').value = '';
            this.fetchSurnames();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    async deleteAdminSurname(id) {
        if (!confirm('Delete this surname?')) return;
        try {
            await window.api.deleteSurname(id);
            this.fetchSurnames();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    renderAdminSurnames() {
        const list = document.getElementById('admin-surnames-list');
        if (!list) return;
        list.innerHTML = surnamesList.map(s => `
            <li style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;">
                ${s.name}
                <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="app.deleteAdminSurname(${s.id})"><i class="fa-solid fa-trash"></i></button>
            </li>
        `).join('');
    },

    async addCommittee() {
        const role = document.getElementById('admin-comm-role').value;
        const name = document.getElementById('admin-comm-name').value;
        const photoUrl = document.getElementById('admin-comm-photo').value;
        if (!role || !name) return alert('Role and Name required');
        try {
            await window.api.addCommitteeMember({ role, name, photoUrl });
            document.getElementById('admin-comm-role').value = '';
            document.getElementById('admin-comm-name').value = '';
            document.getElementById('admin-comm-photo').value = '';
            this.loadCommitteeData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    async deleteCommittee(id) {
        if (!confirm('Delete this committee member?')) return;
        try {
            await window.api.deleteCommitteeMember(id);
            this.loadCommitteeData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    // --- HOME DONATE PANEL ---
    toggleHomeDonate() {
        const panel = document.getElementById('home-donate-panel');
        const btn = document.getElementById('home-donate-btn');
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            btn.classList.add('active');

            const specialPanel = document.getElementById('home-special-donate-panel');
            if (specialPanel) {
                specialPanel.style.display = 'none';
                document.getElementById('home-special-donate-btn').classList.remove('active');
            }

            this.populateHomeDonateSelect();
            // Load scanner image into home panel
            this.loadHomeScannerQR();
            // Scroll to panel
            setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            panel.style.display = 'none';
            btn.classList.remove('active');
        }
    },

    toggleSpecialDonate() {
        const panel = document.getElementById('home-special-donate-panel');
        const btn = document.getElementById('home-special-donate-btn');
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            btn.classList.add('active');

            const normalPanel = document.getElementById('home-donate-panel');
            if (normalPanel) {
                normalPanel.style.display = 'none';
                document.getElementById('home-donate-btn').classList.remove('active');
            }

            // Scroll to panel
            setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            panel.style.display = 'none';
            btn.classList.remove('active');
        }
    },

    populateHomeDonateSelect() {
        const select = document.getElementById('home-donate-surname');
        if (!select) return;
        select.innerHTML = '<option value="">निवडा (Select Surname)</option>' +
            surnamesList.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    },

    async loadHomeScannerQR() {
        try {
            const scanner = await window.api.getSetting('scannerImage');
            const img = document.getElementById('home-scanner-qr');
            const link = document.getElementById('home-scanner-link');
            if (scanner && scanner.value && img) {
                img.src = scanner.value;
                if (link) link.href = scanner.value;
            }
        } catch (e) { console.error(e); }
    },



    previewScreenshot(input) {
        const preview = document.getElementById('screenshot-preview');
        const area = document.getElementById('screenshot-upload-area');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                area.classList.add('has-file');
                area.querySelector('span').textContent = input.files[0].name;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    async submitHomeDonation() {
        const surname = document.getElementById('home-donate-surname').value;
        const name = document.getElementById('home-donate-name').value;
        const amount = document.getElementById('home-donate-amount').value;
        const screenshotInput = document.getElementById('home-donate-screenshot');

        if (!surname || !name || !amount) return alert('कृपया सर्व माहिती भरा (Please fill all fields)');

        try {
            // Upload screenshot if available (public route, no auth needed)
            let screenshotUrl = '';
            if (screenshotInput.files.length > 0) {
                try {
                    const res = await window.api.uploadScreenshot(screenshotInput.files[0]);
                    screenshotUrl = res.url;
                } catch (e) {
                    console.warn('Screenshot upload failed:', e);
                    alert('Screenshot upload failed. Please try again.');
                    return;
                }
            }

            await window.api.addDonation({
                name,
                amount,
                surnameCategory: surname,
                eventName: 'बिरदेव जयंती २०२६',
                screenshotUrl,
                paymentMode: screenshotUrl ? 'Online' : 'Cash'
            });

            alert('तुमची देणगी नोंद यशस्वी झाली! Admin verify करेल.');

            // Reset form
            document.getElementById('home-donate-surname').value = '';
            document.getElementById('home-donate-name').value = '';
            document.getElementById('home-donate-amount').value = '';
            screenshotInput.value = '';
            document.getElementById('screenshot-preview').style.display = 'none';
            document.getElementById('screenshot-upload-area').classList.remove('has-file');
            document.getElementById('screenshot-upload-area').querySelector('span').textContent = 'क्लिक करा किंवा फाइल ड्रॅग करा';

            // Close panel & refresh data
            document.getElementById('home-donate-panel').style.display = 'none';
            document.getElementById('home-donate-btn').classList.remove('active');
            this.loadHomeData();
            this.loadPaidDonorsHome();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    async submitSpecialDonation() {
        const name = document.getElementById('home-special-name').value;
        const amount = document.getElementById('home-special-amount').value;
        const description = document.getElementById('home-special-desc').value;

        if (!name) return alert('कृपया नाव किंवा संस्थेचे नाव भरा (Please enter name/organization)');

        try {
            await window.api.addSpecialDonor({
                name,
                amount: amount || 0,
                description: description || ''
            });

            alert('तुमची विशेष सहकार्याची नोंद यशस्वी झाली! Admin verify करून मंजूर करेल.');

            // Reset form
            document.getElementById('home-special-name').value = '';
            document.getElementById('home-special-amount').value = '';
            document.getElementById('home-special-desc').value = '';

            // Close panel
            this.toggleSpecialDonate();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    toggleFeedbackForm() {
        const formContainer = document.getElementById('feedback-form-container');
        const toggleBtn = document.getElementById('feedback-toggle-btn');
        if (formContainer.style.display === 'none' || !formContainer.style.display) {
            formContainer.style.display = 'block';
            toggleBtn.classList.add('active');
            toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> अभिप्राय / सूचना बंद करा';
            setTimeout(() => formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            formContainer.style.display = 'none';
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles fa-bounce"></i> अभिप्राय / सूचना द्या (Feedback)';
        }
    },

    async submitFeedback() {
        const name = document.getElementById('feedback-name').value;
        const mobile = document.getElementById('feedback-mobile').value;
        const message = document.getElementById('feedback-message').value;

        if (!name || !message) return alert('कृपया नाव आणि संदेश भरा (Name and Message are required)');

        try {
            await window.api.addFeedback({ name, mobile, message });
            alert('तुमचा अभिप्राय यशस्वीरित्या पाठवला आहे. धन्यवाद!');
            document.getElementById('feedback-name').value = '';
            document.getElementById('feedback-mobile').value = '';
            document.getElementById('feedback-message').value = '';
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    copyUPI(elementId) {
        const input = document.getElementById(elementId);
        if (!input || input.value === 'Not available') return;

        // Select text
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices

        // Copy to clipboard
        navigator.clipboard.writeText(input.value).then(() => {
            // Optional: change button icon temporarily
            alert('UPI ID Copied: ' + input.value);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            try {
                document.execCommand('copy');
                alert('UPI ID Copied: ' + input.value);
            } catch (e) {
                alert('Failed to copy UPI ID.');
            }
        });
    },

    // --- PUBLIC SEARCH BAR ---
    _searchDebounce: null,
    searchDonor(query) {
        clearTimeout(this._searchDebounce);
        const dropdown = document.getElementById('search-results-dropdown');

        if (!query || query.trim().length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        this._searchDebounce = setTimeout(async () => {
            try {
                const donations = await window.api.getDonations();
                const q = query.toLowerCase().trim();
                const results = donations.filter(d =>
                    d.name.toLowerCase().includes(q) ||
                    (d.surnameCategory && d.surnameCategory.toLowerCase().includes(q))
                );

                if (results.length === 0) {
                    dropdown.innerHTML = '<div class="search-no-results"><i class="fa-regular fa-face-frown"></i> कोणताही रेकॉर्ड सापडला नाही</div>';
                } else {
                    dropdown.innerHTML = results.map(d => `
                        <div class="search-result-item">
                            <div class="result-info">
                                <h4>${d.name}</h4>
                                <span>${d.surnameCategory} · ₹ ${d.amount}</span>
                            </div>
                            <div class="result-status">
                                ${d.isPaid
                            ? `<span class="status-badge paid">Paid ✓</span>`
                            : `<span class="status-badge unpaid">Pending</span>`
                        }
                            </div>
                        </div>
                    `).join('');
                }
                dropdown.classList.add('active');
            } catch (err) {
                console.error(err);
            }
        }, 300);
    },

    // --- PREMIUM DIGITAL RECEIPT GENERATOR (with God Image & Watermark) ---
    generateReceipt(name, amount, date, surname, paymentMode) {
        // Show loading state
        this.showReceiptModal(null, name, amount);
        const wrapper = document.getElementById('receipt-canvas-wrapper');
        if (wrapper) wrapper.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:#d69e2e;"></i><p style="margin-top:0.5rem;color:#718096;">Generating premium receipt...</p></div>';

        const loadImage = (src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
        };

        Promise.all([
            loadImage('images/murshidheshwargod.png'),
            loadImage('images/shreeram.png')
        ]).then(([godImg, ramImg]) => {
            const canvas = this._drawReceipt(godImg, name, amount, date, surname, paymentMode, ramImg);
            if (wrapper) {
                wrapper.innerHTML = '';
                wrapper.appendChild(canvas);
            }
            this._receiptCanvas = canvas;
        });
    },

    _drawReceipt(godImg, name, amount, date, surname, paymentMode, ramImg) {
        const canvas = document.createElement('canvas');
        const W = 600, H = 780;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Helper for rounded rectangles (compatible with older browsers)
        const roundedRect = (ctx, x, y, width, height, radius) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };

        // === GOLD CERTIFICATE BACKGROUND ===
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#fdf6e3');
        bgGrad.addColorStop(0.3, '#fef9ed');
        bgGrad.addColorStop(0.7, '#fdf6e3');
        bgGrad.addColorStop(1, '#f5e6c8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // === SHREE RAM WATERMARK (Full-Scale Integration) ===
        if (ramImg) {
            ctx.save();
            ctx.globalAlpha = 0.10; // Slightly more subtle for premium look
            ctx.globalCompositeOperation = 'multiply';
            const ramW = 560;
            const ramH = (ramImg.height / ramImg.width) * ramW;
            // Perfectly centered horizontally, positioned below header
            ctx.drawImage(ramImg, (W - ramW) / 2, 150, ramW, ramH);
            ctx.restore();
        }

        // === OUTER DECORATIVE BORDER ===
        ctx.strokeStyle = '#c8a23c';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        // === CORNER DECORATIONS ===
        const drawCorner = (x, y, flipX, flipY) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(flipX, flipY);
            ctx.strokeStyle = '#c8a23c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 30);
            ctx.lineTo(0, 0);
            ctx.lineTo(30, 0);
            ctx.stroke();
            // Decorative dot
            ctx.fillStyle = '#d4af37';
            ctx.beginPath();
            ctx.arc(5, 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };
        drawCorner(25, 25, 1, 1);
        drawCorner(W - 25, 25, -1, 1);
        drawCorner(25, H - 25, 1, -1);
        drawCorner(W - 25, H - 25, -1, -1);

        // === TOP HEADER SECTION ===
        // Left text block
        ctx.fillStyle = '#8B0000';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('BIRDEV JAYANTI', W / 2 - 55, 58);
        ctx.fillStyle = '#5a3e1b';
        ctx.font = '10px sans-serif';
        ctx.fillText('Birdev Jayanti Utsav Samiti 2026', W / 2 - 55, 74);
        ctx.fillText('birdev2k26.vercel.app', W / 2 - 55, 87);

        // Right text block
        ctx.fillStyle = '#8B0000';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('UTSAV SAMITI', W / 2 + 55, 58);
        ctx.fillStyle = '#5a3e1b';
        ctx.font = '10px sans-serif';
        ctx.fillText('Official Receipt', W / 2 + 55, 74);
        ctx.fillText('birdev2k26.vercel.app', W / 2 + 55, 87);

        // God image in center
        if (godImg) {
            const imgSize = 80;
            const imgX = W / 2 - imgSize / 2;
            const imgY = 30;

            // Circular clip for god image
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2 + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(godImg, imgX, imgY, imgSize, imgSize);
            ctx.restore();
        }

        // === DIVIDER ===
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(40, 120);
        ctx.lineTo(W - 40, 120);
        ctx.stroke();
        ctx.setLineDash([]);

        // === DONATION DETAILS ===
        const startY = 155;
        const rowH = 52;
        const labelX = 55;
        const valueX = 250;

        const drawInfoRow = (label, value, y, valueColor = '#1a202c', valueFontSize = '17px') => {
            // Label
            ctx.fillStyle = '#8B6914';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, labelX, y);

            // Value - Aligned slightly to the right for balance
            ctx.fillStyle = valueColor;
            ctx.font = `bold ${valueFontSize} sans-serif`;
            ctx.fillText(value, valueX + 20, y);

            // Subtle underline for each row
            ctx.strokeStyle = 'rgba(139, 105, 20, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(labelX, y + 10);
            ctx.lineTo(W - labelX, y + 10);
            ctx.stroke();
        };

        drawInfoRow('नाव (Name):', name, startY);
        drawInfoRow('आडनाव (Surname):', surname || '-', startY + rowH);

        // Amount row - special large styling
        ctx.fillStyle = '#8B6914';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('रक्कम (Amount):', labelX, startY + rowH * 2);
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`₹ ${amount}`, valueX, startY + rowH * 2 + 4);

        drawInfoRow('तारीख (Date):', date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-', startY + rowH * 3);
        drawInfoRow('पेमेंट पद्धत (Mode):', paymentMode || 'Cash', startY + rowH * 4, paymentMode === 'Online' ? '#2563eb' : '#1a202c');

        // Sponsors row
        ctx.fillStyle = '#8B6914';
        ctx.font = '13px sans-serif';
        ctx.fillText('प्रायोजक (Sponsors):', labelX, startY + rowH * 5);
        ctx.fillStyle = '#8B0000';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('बिरदेव कम्युनिटी मेंबर्स (Birdev', valueX, startY + rowH * 5);
        ctx.fillText('Community Members)', valueX, startY + rowH * 5 + 20);

        // === PAID STAMP ===
        const stampY = startY + rowH * 6 + 15;
        // Gold badge background
        const stampGrad = ctx.createLinearGradient(W / 2 - 80, stampY, W / 2 + 80, stampY + 45);
        stampGrad.addColorStop(0, '#b7791f');
        stampGrad.addColorStop(0.5, '#d69e2e');
        stampGrad.addColorStop(1, '#ecc94b');
        ctx.fillStyle = stampGrad;
        roundedRect(ctx, W / 2 - 80, stampY, 160, 45, 8);
        ctx.fill();
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        roundedRect(ctx, W / 2 - 78, stampY + 3, 160, 45, 8);
        ctx.fill();
        // Re-draw badge on top
        ctx.fillStyle = stampGrad;
        roundedRect(ctx, W / 2 - 80, stampY, 160, 45, 8);
        ctx.fill();
        // PAID text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAID', W / 2, stampY + 33);

        // === VERIFIED BADGE ===
        const verifyY = stampY + 60;
        ctx.fillStyle = 'rgba(22, 163, 74, 0.12)';
        roundedRect(ctx, W / 2 - 140, verifyY, 280, 38, 19);
        ctx.fill();
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.5;
        roundedRect(ctx, W / 2 - 140, verifyY, 280, 38, 19);
        ctx.stroke();
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ देणगी यशस्वी (Donation Successful)', W / 2, verifyY + 18);
        ctx.fillStyle = '#718096';
        ctx.font = '10px sans-serif';
        ctx.fillText('Official & Verified Receipt', W / 2, verifyY + 32);

        // === RECEIPT ID (bottom right) ===
        const receiptId = `R${Date.now().toString().slice(-6)}`;
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`birdev2k26.vercel.app/verify/${receiptId}`, W - 40, H - 55);

        // === BOTTOM GOLD BAR ===
        const btmGrad = ctx.createLinearGradient(0, H - 40, W, H);
        btmGrad.addColorStop(0, '#b7791f');
        btmGrad.addColorStop(0.5, '#d4af37');
        btmGrad.addColorStop(1, '#ecc94b');
        ctx.fillStyle = btmGrad;
        ctx.fillRect(20, H - 42, W - 40, 20);

        // Footer text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BIRDEV JAYANTI UTSAV SAMITI 2026 | birdev2k26.vercel.app | ♦️', W / 2, H - 28);

        // === LARGE WATERMARK ===
        ctx.save();
        ctx.translate(W / 2, H / 2 - 20);
        ctx.rotate(-0.35);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.06)';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAID', 0, 0);
        ctx.restore();

        return canvas;
    },

    showReceiptModal(canvas, name, amount) {
        const existing = document.getElementById('receipt-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'receipt-overlay';
        overlay.id = 'receipt-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div class="receipt-modal">
                <button class="receipt-close" onclick="document.getElementById('receipt-overlay').remove()">&times;</button>
                <h3 style="text-align: center; margin-bottom: 0.5rem; color: var(--primary-dark);">
                    <i class="fa-solid fa-file-invoice"></i> देणगी पावती (Receipt)
                </h3>
                <div class="receipt-canvas-wrapper" id="receipt-canvas-wrapper"></div>
                <div class="receipt-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 1rem;">
                    <button class="btn btn-success" onclick="app.downloadReceipt()" style="padding: 0.7rem 1.2rem; border-radius: 10px;">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                    <button class="btn" onclick="app.shareWhatsApp()" style="padding: 0.7rem 1.2rem; border-radius: 10px; background: #25D366; color: white; border: none; cursor: pointer; font-weight: 600;">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="btn btn-danger" onclick="document.getElementById('receipt-overlay').remove()" style="padding: 0.7rem 1.2rem; border-radius: 10px;">
                        <i class="fa-solid fa-xmark"></i> Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (canvas) {
            document.getElementById('receipt-canvas-wrapper').appendChild(canvas);
        }

        // Store for download / share
        this._receiptCanvas = canvas;
        this._receiptName = name;
        this._receiptAmount = amount;
    },

    downloadReceipt() {
        if (!this._receiptCanvas) return;
        const link = document.createElement('a');
        link.download = `Receipt_${this._receiptName || 'Donation'}.png`;
        link.href = this._receiptCanvas.toDataURL('image/png');
        link.click();
    },

    shareWhatsApp() {
        const name = this._receiptName || 'Donor';
        const amount = this._receiptAmount || '';
        const message = `🏛️ *बिरदेव जयंती उत्सव समिती 2K26*\n\n✅ *देणगी पावती (Donation Receipt)*\n\n👤 नाव: *${name}*\n💰 रक्कम: *₹ ${amount}*\n📅 तारीख: ${new Date().toLocaleDateString('en-IN')}\n\n✨ देणगी यशस्वीरित्या जमा झाली!\n🌐 Website: birdev2k26.vercel.app`;

        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => app.init());
