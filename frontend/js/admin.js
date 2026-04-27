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
        container.innerHTML = 'Loading...';
        
        try {
            let donations = await window.api.getDonations();
            
            // Only show paid or approved ones here (or all, let's show all)
            if(filter !== 'ALL') {
                donations = donations.filter(d => d.surnameCategory === filter);
            }
            
            donations.sort((a,b) => b.id - a.id);

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
                    <div style="margin-top: 1rem; border-top: 1px dashed #ccc; padding-top: 1rem; display: flex; gap: 0.5rem;">
                        ${!d.isPaid ? `<button class="btn btn-success" style="padding: 0.2rem 0.5rem;" onclick="adminApp.markPaid(${d.id})">Mark Paid</button>` : ''}
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deleteDonation(${d.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `).join('');

        } catch(err) {
            container.innerHTML = 'Error loading data.';
        }
    },

    async addDonationDirectly() {
        const surname = document.getElementById('admin-donor-surname').value;
        const name = document.getElementById('admin-donor-name').value;
        const amount = document.getElementById('admin-donor-amount').value;
        const eventName = document.getElementById('admin-donor-event').value || 'बिरदेव जयंती २०२४';

        if(!surname || !name || !amount) return alert('Please fill surname, name, and amount.');

        try {
            await window.api.addDonation({ name, amount, surnameCategory: surname, eventName });
            
            // Clear inputs
            document.getElementById('admin-donor-name').value = '';
            document.getElementById('admin-donor-amount').value = '';
            
            this.filterDonations();
            
            // Ask to mark as paid immediately since admin added it
            alert('Donation added! (Currently marked as Pending. Please click Mark Paid on the card below to finalize).');
        } catch(err) {
            alert(err.message);
        }
    },

    // --- PENDING ---
    async loadPending() {
        const container = document.getElementById('pending-list-container');
        container.innerHTML = 'Loading...';
        try {
            const donations = await window.api.getDonations();
            const pending = donations.filter(d => !d.isPaid);
            if(pending.length === 0) {
                container.innerHTML = '<p>No pending approvals. All good!</p>';
                return;
            }
            container.innerHTML = pending.map(d => `
                <div class="donor-card unpaid">
                    <div class="donor-info">
                        <h4>${d.name} <span style="font-size: 0.8rem; color: #718096;">(${d.surnameCategory}) - ₹ ${d.amount}</span></h4>
                        <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.2rem;">Event: ${d.eventName}</p>
                    </div>
                    <div class="admin-actions-cell" style="display:flex; gap:0.5rem; margin-top: 1rem;">
                        <button class="btn btn-success" onclick="adminApp.markPaid(${d.id})">Approve (Mark Paid)</button>
                        <button class="btn btn-danger" onclick="adminApp.deleteDonation(${d.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch(err) {
            container.innerHTML = 'Error loading records.';
        }
    },

    async markPaid(id) {
        const mode = prompt("Payment Mode (Cash/Online):", "Cash");
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

    // --- SURNAMES ---
    async loadSurnamesView() {
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
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
