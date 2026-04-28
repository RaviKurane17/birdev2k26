let surnamesList = [];

const adminApp = {
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadInitialData();
    },

    checkAuth() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = 'index.html'; // Redirect to public site
        }
    },

    logout() {
        localStorage.removeItem('adminToken');
        window.location.href = 'index.html';
    },

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.showView(view);
                
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Load view specific data
                if(view === 'dashboard') this.loadDashboard();
                if(view === 'donations') this.loadDonationsView();
                if(view === 'pending') this.loadPending();
                if(view === 'surnames') this.loadSurnamesView();
                if(view === 'special') this.loadSpecialDonorsAdmin();
                if(view === 'committee') this.loadCommitteeView();
                if(view === 'settings') this.loadSettingsView();
            });
        });

        // Mobile menu toggle
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        document.querySelectorAll('.mobile-menu-toggle, #admin-menu-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                sidebar.classList.add('open');
                if(overlay) overlay.classList.add('active');
            });
        });
    },

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if(sidebar) sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
    },

    showView(viewId) {
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        const el = document.getElementById(`view-${viewId}`);
        if(el) el.classList.add('active');
        const navItem = document.querySelector(`li[data-view="${viewId}"]`);
        if(navItem) document.getElementById('page-title').innerText = navItem.innerText.trim();
        this.closeSidebar();
    },

    async loadInitialData() {
        await this.fetchSurnames();
        this.loadDashboard();
    },

    async fetchSurnames() {
        try {
            surnamesList = await window.api.getSurnames();
            
            // Populate select dropdowns
            const options = '<option value="">Select Surname...</option>' + 
                surnamesList.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            
            const filterOptions = '<option value="ALL">All Surnames</option>' + 
                surnamesList.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

            if(document.getElementById('admin-donor-surname')) document.getElementById('admin-donor-surname').innerHTML = options;
            if(document.getElementById('filter-surname')) document.getElementById('filter-surname').innerHTML = filterOptions;
        } catch(err) {
            console.error(err);
        }
    },

    // --- DASHBOARD (FINANCIALS) ---
    async loadDashboard() {
        try {
            const stats = await window.api.getStats();
            document.getElementById('dash-collected').innerText = `₹ ${stats.totalCollected}`;
            document.getElementById('dash-balance').innerText = `₹ ${stats.remainingBalance}`;
            document.getElementById('dash-expenses').innerText = `₹ ${stats.totalExpenses}`;

            const expenses = await window.api.getExpenses();
            const tbody = document.getElementById('expenses-table-body');
            tbody.innerHTML = expenses.map(e => `
                <tr>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td>${e.description}</td>
                    <td>₹ ${e.amount}</td>
                    <td><button class="btn btn-danger" style="padding:0.2rem 0.5rem;" onclick="adminApp.deleteExpense(${e.id})"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `).join('');
        } catch(err) {
            console.error(err);
        }
    },

    async addExpense() {
        const desc = document.getElementById('new-expense-desc').value;
        const amount = document.getElementById('new-expense-amount').value;
        const date = document.getElementById('new-expense-date').value;
        if(!desc || !amount || !date) return alert('Please fill all fields');
        try {
            await window.api.addExpense({ description: desc, amount, date });
            document.getElementById('new-expense-desc').value = '';
            document.getElementById('new-expense-amount').value = '';
            document.getElementById('new-expense-date').value = '';
            this.loadDashboard();
        } catch(err) {
            alert(err.message);
        }
    },

    async deleteExpense(id) {
        if(!confirm('Delete this expense?')) return;
        try {
            await window.api.deleteExpense(id);
            this.loadDashboard();
        } catch(err) {
            alert(err.message);
        }
    },

    // --- MANAGE DONATIONS ---
    async loadDonationsView() {
        this.filterDonations();
    },

    async filterDonations() {
        const filter = document.getElementById('filter-surname').value;
        const container = document.getElementById('all-donations-list');
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            let donations = await window.api.getDonations();
            
            if(filter !== 'ALL') {
                donations = donations.filter(d => d.surnameCategory === filter);
            }
            
            donations.sort((a,b) => b.id - a.id);

            if(donations.length === 0) {
                container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 2rem;">कोणतीही माहिती उपलब्ध नाही.</p>';
                return;
            }

            container.innerHTML = donations.map(d => `
                <div class="donor-card ${d.isPaid ? 'paid' : 'unpaid'}">
                    <div class="donor-card-header">
                        <div class="donor-info">
                            <h4>${d.name} <span style="font-size: 0.8rem; color: var(--text-light);">(${d.surnameCategory})</span></h4>
                            <span class="amount">₹ ${d.amount}</span>
                        </div>
                        <div class="donor-status">
                            ${d.isPaid ? `<span class="status-badge paid">Paid</span>` : `<span class="status-badge unpaid">Pending</span>`}
                        </div>
                    </div>
                    ${d.screenshot_url ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px;">
                        <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);"><i class="fa-solid fa-image"></i> Payment Screenshot (Online):</p>
                        <a href="${d.screenshot_url}" target="_blank">
                            <img src="${d.screenshot_url}" alt="Payment Screenshot" style="max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;">
                        </a>
                    </div>
                    ` : ''}
                    <div style="margin-top: 1rem; border-top: 1px dashed #ccc; padding-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${!d.isPaid ? `<button class="btn btn-success" style="padding: 0.2rem 0.5rem;" onclick="adminApp.markPaid(${d.id}, '${d.screenshot_url ? 'Online' : 'Cash'}')">Mark Paid</button>` : ''}
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deleteDonation(${d.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `).join('');

        } catch(err) {
            container.innerHTML = '<p style="color: var(--danger-color);">Error loading data.</p>';
        }
    },

    async addDonationDirectly() {
        const surname = document.getElementById('admin-donor-surname').value;
        const name = document.getElementById('admin-donor-name').value;
        const amount = document.getElementById('admin-donor-amount').value;
        const eventName = document.getElementById('admin-donor-event').value || 'बिरदेव जयंती २०२६';

        if(!surname || !name || !amount) return alert('Please fill surname, name, and amount.');

        try {
            await window.api.addDonation({ name, amount, surnameCategory: surname, eventName });
            
            // Clear inputs
            document.getElementById('admin-donor-name').value = '';
            document.getElementById('admin-donor-amount').value = '';
            
            this.filterDonations();
            
            alert('Donation added! (Currently marked as Pending. Please click Mark Paid on the card below to finalize).');
        } catch(err) {
            alert(err.message);
        }
    },

    // --- PENDING ---
    async loadPending() {
        const container = document.getElementById('pending-list-container');
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        try {
            const donations = await window.api.getDonations();
            const pending = donations.filter(d => !d.isPaid);
            if(pending.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle" style="font-size: 3rem; color: var(--success-color); margin-bottom: 1rem;"></i><p>No pending approvals. All good!</p></div>';
                return;
            }
            container.innerHTML = pending.map(d => `
                <div class="donor-card unpaid">
                    <div class="donor-info">
                        <h4>${d.name} <span style="font-size: 0.8rem; color: #718096;">(${d.surnameCategory}) - ₹ ${d.amount}</span></h4>
                        <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.2rem;">Event: ${d.eventName}</p>
                        ${d.screenshot_url ? `<span class="status-badge paid" style="background: var(--primary-color); margin-top: 0.5rem; display: inline-block;">Online Payment</span>` : ''}
                    </div>
                    ${d.screenshot_url ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px;">
                        <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.5rem;"><i class="fa-solid fa-image"></i> Payment Screenshot:</p>
                        <a href="${d.screenshot_url}" target="_blank">
                            <img src="${d.screenshot_url}" alt="Screenshot" style="max-width: 100%; max-height: 200px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        </a>
                    </div>
                    ` : ''}
                    <div class="admin-actions-cell" style="display:flex; gap:0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="adminApp.markPaid(${d.id}, '${d.screenshot_url ? 'Online' : 'Cash'}')">Approve (Mark Paid)</button>
                        <button class="btn btn-danger" onclick="adminApp.deleteDonation(${d.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch(err) {
            container.innerHTML = '<p style="color: var(--danger-color);">Error loading records.</p>';
        }
    },

    async markPaid(id, defaultMode = 'Cash') {
        const mode = prompt("Payment Mode (Cash/Online):", defaultMode);
        if(!mode) return;
        try {
            await window.api.updateDonation(id, {
                isPaid: true,
                paymentMode: mode,
                date: new Date().toISOString().split('T')[0]
            });
            // Reload whatever view is active
            if(document.getElementById('view-donations').classList.contains('active')) this.filterDonations();
            if(document.getElementById('view-pending').classList.contains('active')) this.loadPending();
        } catch(err) {
            alert('Error updating: ' + err.message);
        }
    },

    async deleteDonation(id) {
        if(!confirm('Delete this record?')) return;
        try {
            await window.api.deleteDonation(id);
            if(document.getElementById('view-donations').classList.contains('active')) this.filterDonations();
            if(document.getElementById('view-pending').classList.contains('active')) this.loadPending();
        } catch(err) {
            alert('Error deleting: ' + err.message);
        }
    },

    // --- SURNAMES (आडनाव यादी) ---
    async loadSurnamesView() {
        // Render grid view
        const grid = document.getElementById('admin-surnames-grid');
        if(grid) {
            grid.innerHTML = surnamesList.map((s, index) => 
                `<div class="surname-btn" style="cursor: default; position: relative;">
                    <span>${index + 1}. ${s.name}</span>
                </div>`
            ).join('');
        }

        // Render table view
        const tbody = document.getElementById('admin-surnames-table');
        tbody.innerHTML = surnamesList.map(s => `
            <tr>
                <td style="padding: 1rem; border-bottom: 1px solid var(--border-color);">${s.name}</td>
                <td style="padding: 1rem; text-align: right; border-bottom: 1px solid var(--border-color);">
                    <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deleteSurname(${s.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async addSurname() {
        const name = document.getElementById('new-surname-input').value;
        if(!name) return;
        try {
            await window.api.addSurname(name);
            document.getElementById('new-surname-input').value = '';
            await this.fetchSurnames();
            this.loadSurnamesView();
        } catch(err) {
            alert(err.message);
        }
    },

    async deleteSurname(id) {
        if(!confirm('Delete this surname?')) return;
        try {
            await window.api.deleteSurname(id);
            await this.fetchSurnames();
            this.loadSurnamesView();
        } catch(err) {
            alert(err.message);
        }
    },

    // --- विशेष सहकार्य (SPECIAL DONORS) ---
    async loadSpecialDonorsAdmin() {
        const container = document.getElementById('special-donors-admin-list');
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        try {
            const donors = await window.api.getSpecialDonors();
            if(donors.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-hand-holding-heart" style="font-size: 3rem; color: var(--primary-dark); margin-bottom: 1rem;"></i><p>अजून विशेष सहकार्य जोडलेले नाही.</p></div>';
                return;
            }
            container.innerHTML = donors.map(d => `
                <div class="special-donor-card">
                    <div class="special-donor-info">
                        <div class="special-donor-icon">
                            <i class="fa-solid fa-hand-holding-heart"></i>
                        </div>
                        <div class="special-donor-details">
                            <h4>${d.name}</h4>
                            ${d.amount > 0 ? `<span class="amount" style="color: var(--success-color); font-weight: 700;">₹ ${d.amount}</span>` : ''}
                            ${d.description ? `<p style="color: var(--text-light); margin-top: 0.3rem; font-size: 0.9rem;">${d.description}</p>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-danger" style="padding: 0.2rem 0.5rem; align-self: flex-start;" onclick="adminApp.deleteSpecialDonor(${d.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        } catch(err) {
            container.innerHTML = '<p style="color: var(--danger-color);">Error loading records.</p>';
        }
    },

    async addSpecialDonor() {
        const name = document.getElementById('special-donor-name').value;
        const amount = document.getElementById('special-donor-amount').value;
        const description = document.getElementById('special-donor-desc').value;

        if(!name) return alert('कृपया नाव प्रविष्ट करा (Please enter name)');

        try {
            await window.api.addSpecialDonor({ name, amount: amount || 0, description: description || '' });
            document.getElementById('special-donor-name').value = '';
            document.getElementById('special-donor-amount').value = '';
            document.getElementById('special-donor-desc').value = '';
            this.loadSpecialDonorsAdmin();
            alert('विशेष सहकार्य यशस्वीरित्या जोडले!');
        } catch(err) {
            alert('Error: ' + err.message);
        }
    },

    async deleteSpecialDonor(id) {
        if(!confirm('हे विशेष सहकार्य रेकॉर्ड हटवायचे आहे का?')) return;
        try {
            await window.api.deleteSpecialDonor(id);
            this.loadSpecialDonorsAdmin();
        } catch(err) {
            alert('Error deleting: ' + err.message);
        }
    },

    // --- COMMITTEE ---
    async loadCommitteeView() {
        const container = document.getElementById('admin-committee-grid');
        try {
            const committee = await window.api.getCommittee();
            container.innerHTML = committee.map(c => `
                <div class="member-card">
                    <div class="avatar"><img src="${c.photoUrl || 'https://api.dicebear.com/6.x/avataaars/svg?seed=' + c.name}" alt="${c.role}"></div>
                    <h4>${c.role}</h4>
                    <p>${c.name}</p>
                    <button class="btn btn-danger" style="margin-top: 1rem; padding: 0.2rem 0.5rem;" onclick="adminApp.deleteCommittee(${c.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            `).join('');
        } catch(err) {
            console.error(err);
        }
    },

    async addCommittee() {
        const role = document.getElementById('comm-role').value;
        const name = document.getElementById('comm-name').value;
        const photoInput = document.getElementById('comm-photo');
        
        if(!role || !name) return alert('Role and Name required');

        try {
            let photoUrl = '';
            if(photoInput.files.length > 0) {
                document.getElementById('comm-role').disabled = true; // basic loading state
                const res = await window.api.uploadImage(photoInput.files[0]);
                photoUrl = res.url;
                document.getElementById('comm-role').disabled = false;
            }

            await window.api.addCommitteeMember({role, name, photoUrl});
            document.getElementById('comm-role').value = '';
            document.getElementById('comm-name').value = '';
            photoInput.value = '';
            this.loadCommitteeView();
        } catch(err) {
            document.getElementById('comm-role').disabled = false;
            alert(err.message);
        }
    },

    async deleteCommittee(id) {
        if(!confirm('Delete this member?')) return;
        try {
            await window.api.deleteCommitteeMember(id);
            this.loadCommitteeView();
        } catch(err) {
            alert(err.message);
        }
    },

    // --- SETTINGS ---
    async loadSettingsView() {
        try {
            const news = await window.api.getSetting('newsTicker');
            if(news && news.value) {
                document.getElementById('settings-news-ticker').value = news.value;
            }
            
            const banner = await window.api.getSetting('bannerImage');
            if(banner && banner.value) {
                const img = document.getElementById('current-banner-preview');
                img.src = banner.value;
                img.style.display = 'block';
            }

            // Load scanner image preview
            const scanner = await window.api.getSetting('scannerImage');
            if(scanner && scanner.value) {
                const scannerImg = document.getElementById('current-scanner-preview');
                scannerImg.src = scanner.value;
                scannerImg.style.display = 'block';
            }
        } catch(err) {
            console.error(err);
        }
    },

    async updateNews() {
        const value = document.getElementById('settings-news-ticker').value;
        try {
            await window.api.updateSetting('newsTicker', value);
            alert('News Ticker updated successfully!');
        } catch(err) {
            alert(err.message);
        }
    },

    async updateBannerImage() {
        const fileInput = document.getElementById('settings-news-image');
        if(fileInput.files.length === 0) return alert('Please select an image first.');
        try {
            document.getElementById('settings-news-image').disabled = true;
            const res = await window.api.uploadImage(fileInput.files[0]);
            await window.api.updateSetting('bannerImage', res.url);
            
            const img = document.getElementById('current-banner-preview');
            img.src = res.url;
            img.style.display = 'block';
            
            alert('Banner Image updated successfully!');
            document.getElementById('settings-news-image').disabled = false;
        } catch(err) {
            document.getElementById('settings-news-image').disabled = false;
            alert(err.message);
        }
    },

    async removeBannerImage() {
        if(!confirm('Remove banner image from home page?')) return;
        try {
            await window.api.updateSetting('bannerImage', '');
            document.getElementById('current-banner-preview').style.display = 'none';
            document.getElementById('settings-news-image').value = '';
            alert('Banner removed.');
        } catch(err) {
            alert(err.message);
        }
    },

    // --- SCANNER IMAGE ---
    async updateScannerImage() {
        const fileInput = document.getElementById('settings-scanner-image');
        if(fileInput.files.length === 0) return alert('कृपया स्कॅनर इमेज निवडा (Please select a scanner image).');
        try {
            fileInput.disabled = true;
            const res = await window.api.uploadImage(fileInput.files[0]);
            await window.api.updateSetting('scannerImage', res.url);
            
            const img = document.getElementById('current-scanner-preview');
            img.src = res.url;
            img.style.display = 'block';
            
            alert('Scanner image updated successfully! It will now appear on the देणगी भरा page.');
            fileInput.disabled = false;
        } catch(err) {
            fileInput.disabled = false;
            alert(err.message);
        }
    },

    async removeScannerImage() {
        if(!confirm('Remove scanner image from donation page?')) return;
        try {
            await window.api.updateSetting('scannerImage', '');
            document.getElementById('current-scanner-preview').style.display = 'none';
            document.getElementById('settings-scanner-image').value = '';
            alert('Scanner removed.');
        } catch(err) {
            alert(err.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
