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
                if(view === 'previous') this.loadPreviousDonations();
                if(view === 'feedbacks') this.loadFeedbacks();
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
                donations = donations.filter(d => (d.surnameCategory || '').trim() === (filter || '').trim());
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
                        ${!d.isPaid ? `
                        <select id="mode-select-${d.id}" style="padding: 0.3rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.85rem;">
                            <option value="Cash" ${!d.screenshot_url ? 'selected' : ''}>Cash</option>
                            <option value="Online" ${d.screenshot_url ? 'selected' : ''}>Online</option>
                        </select>
                        <button class="btn btn-success" style="padding: 0.2rem 0.5rem;" onclick="adminApp.markPaid(${d.id}, document.getElementById('mode-select-${d.id}').value)">Mark Paid</button>` : ''}
                        <button class="btn" style="padding: 0.2rem 0.5rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;" onclick="adminApp.openEditModal(${d.id}, '${d.name.replace(/'/g, "\\'")}', ${d.amount}, '${(d.surnameCategory || '').replace(/'/g, "\\'")}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deleteDonation(${d.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `).join('');

        } catch(err) {
            container.innerHTML = '<p style="color: var(--danger-color);">Error loading data.</p>';
        }
    },

    // --- EDIT DONATION MODAL ---
    openEditModal(id, name, amount, surname) {
        const existing = document.getElementById('edit-donation-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'edit-donation-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:2rem;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideDown 0.3s ease;">
                <h3 style="margin-bottom:1.5rem;color:var(--primary-dark);text-align:center;">
                    <i class="fa-solid fa-pen-to-square"></i> Edit Donation
                </h3>
                <div style="display:flex;flex-direction:column;gap:1rem;">
                    <div>
                        <label style="font-size:0.85rem;font-weight:600;color:#4a5568;margin-bottom:0.3rem;display:block;">नाव (Name)</label>
                        <input type="text" id="edit-name" value="${name}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;transition:border 0.3s;" onfocus="this.style.borderColor='#d69e2e'" onblur="this.style.borderColor='#e2e8f0'">
                    </div>
                    <div>
                        <label style="font-size:0.85rem;font-weight:600;color:#4a5568;margin-bottom:0.3rem;display:block;">रक्कम (Amount ₹)</label>
                        <input type="number" id="edit-amount" value="${amount}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;transition:border 0.3s;" onfocus="this.style.borderColor='#d69e2e'" onblur="this.style.borderColor='#e2e8f0'">
                    </div>
                    <div>
                        <label style="font-size:0.85rem;font-weight:600;color:#4a5568;margin-bottom:0.3rem;display:block;">आडनाव (Surname)</label>
                        <input type="text" id="edit-surname" value="${surname}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;transition:border 0.3s;" onfocus="this.style.borderColor='#d69e2e'" onblur="this.style.borderColor='#e2e8f0'">
                    </div>
                </div>
                <div style="display:flex;gap:0.8rem;margin-top:1.5rem;">
                    <button class="btn btn-success" style="flex:1;padding:0.8rem;font-size:1rem;border-radius:10px;" onclick="adminApp.saveEdit(${id})">
                        <i class="fa-solid fa-check"></i> Save
                    </button>
                    <button class="btn btn-danger" style="flex:1;padding:0.8rem;font-size:1rem;border-radius:10px;" onclick="document.getElementById('edit-donation-overlay').remove()">
                        <i class="fa-solid fa-xmark"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async saveEdit(id) {
        const name = document.getElementById('edit-name').value.trim();
        const amount = document.getElementById('edit-amount').value;
        const surnameCategory = document.getElementById('edit-surname').value.trim();

        if (!name || !amount) return alert('Name and amount are required.');

        try {
            await window.api.updateDonation(id, { name, amount: parseFloat(amount), surnameCategory });
            document.getElementById('edit-donation-overlay').remove();
            this.filterDonations();
            alert('Donation updated successfully!');
        } catch(err) {
            alert('Error: ' + err.message);
        }
    },

    async addDonationDirectly() {
        const surname = document.getElementById('admin-donor-surname').value;
        const name = document.getElementById('admin-donor-name').value;
        const amount = document.getElementById('admin-donor-amount').value;
        const eventName = document.getElementById('admin-donor-event').value || 'बिरदेव जयंती २०२६';
        const paymentMode = document.getElementById('admin-donor-mode').value;
        const markPaid = document.getElementById('admin-donor-paid').checked;

        if(!surname || !name || !amount) return alert('Please fill surname, name, and amount.');

        try {
            // First create the donation
            const result = await window.api.addDonation({ name, amount, surnameCategory: surname, eventName });
            
            // If mark as paid, immediately update it
            if(markPaid && result.id) {
                await window.api.updateDonation(result.id, {
                    isPaid: true,
                    paymentMode: paymentMode,
                    date: new Date().toISOString().split('T')[0]
                });
            }
            
            // Clear inputs
            document.getElementById('admin-donor-name').value = '';
            document.getElementById('admin-donor-amount').value = '';
            
            this.filterDonations();
            
            alert(markPaid ? 'Donation added & marked as Paid!' : 'Donation added as Pending.');
        } catch(err) {
            alert(err.message);
        }
    },

    // --- PENDING ---
    _pendingTab: 'online',

    switchPendingTab(tab) {
        this._pendingTab = tab;
        const onlineContainer = document.getElementById('pending-online-container');
        const cashContainer = document.getElementById('pending-cash-container');
        const onlineTab = document.getElementById('pending-tab-online');
        const cashTab = document.getElementById('pending-tab-cash');

        if (tab === 'online') {
            onlineContainer.style.display = 'block';
            cashContainer.style.display = 'none';
            onlineTab.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            onlineTab.style.color = 'white';
            onlineTab.style.opacity = '1';
            cashTab.style.background = 'var(--bg-light)';
            cashTab.style.color = 'var(--text-dark)';
            cashTab.style.opacity = '0.7';
        } else {
            onlineContainer.style.display = 'none';
            cashContainer.style.display = 'block';
            cashTab.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
            cashTab.style.color = 'white';
            cashTab.style.opacity = '1';
            onlineTab.style.background = 'var(--bg-light)';
            onlineTab.style.color = 'var(--text-dark)';
            onlineTab.style.opacity = '0.7';
        }
    },

    async loadPending() {
        const onlineContainer = document.getElementById('pending-online-container');
        const cashContainer = document.getElementById('pending-cash-container');
        onlineContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        cashContainer.innerHTML = '';

        try {
            const donations = await window.api.getDonations();
            let pending = donations.filter(d => !d.isPaid);

            // Filter by search input
            const searchInput = document.getElementById('pending-search-input');
            if (searchInput && searchInput.value.trim() !== '') {
                const query = searchInput.value.trim().toLowerCase();
                pending = pending.filter(d => 
                    (d.name && d.name.toLowerCase().includes(query)) || 
                    (d.surnameCategory && d.surnameCategory.toLowerCase().includes(query))
                );
            }

            // Split: Online = has screenshot OR paymentMode is 'Online'
            const onlinePending = pending.filter(d => d.screenshot_url || d.paymentMode === 'Online');
            const cashPending = pending.filter(d => !d.screenshot_url && d.paymentMode !== 'Online');

            // Update counts
            document.getElementById('pending-online-count').innerText = onlinePending.length;
            document.getElementById('pending-cash-count').innerText = cashPending.length;

            // Render Online pending
            if(onlinePending.length === 0) {
                onlineContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 0.5rem;"></i><p>No online pending approvals.</p></div>';
            } else {
                onlineContainer.innerHTML = onlinePending.map(d => `
                    <div class="donor-card unpaid" style="cursor: pointer;" onclick="this.classList.toggle('expanded')">
                        <div class="donor-card-header">
                            <div class="donor-info">
                                <h4>${d.name} <span style="font-size: 0.8rem; color: #718096;">(${d.surnameCategory}) - ₹ ${d.amount}</span></h4>
                                <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.2rem;">Event: ${d.eventName}</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <span class="status-badge paid" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;">Online</span>
                                ${d.screenshot_url ? '<span style="font-size: 0.75rem; color: var(--text-light);"><i class="fa-solid fa-chevron-down"></i> Screenshot</span>' : ''}
                            </div>
                        </div>
                        ${d.screenshot_url ? `
                        <div class="donor-details" onclick="event.stopPropagation()" style="margin-top: 1rem; padding: 1rem; background: rgba(59,130,246,0.05); border-radius: 8px;">
                            <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.5rem; color: #3b82f6;"><i class="fa-solid fa-image"></i> Payment Screenshot:</p>
                            <a href="${d.screenshot_url}" target="_blank">
                                <img src="${d.screenshot_url}" alt="Screenshot" style="max-width: 100%; max-height: 250px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                            </a>
                        </div>
                        ` : ''}
                        <div class="donor-details" onclick="event.stopPropagation()" style="border-top: 1px dashed #ccc; padding-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                            <select id="pending-mode-${d.id}" style="padding: 0.4rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.9rem;">
                                <option value="Online" selected>Online</option>
                                <option value="Cash">Cash</option>
                            </select>
                            <button class="btn btn-success" onclick="adminApp.markPaid(${d.id}, document.getElementById('pending-mode-${d.id}').value)"><i class="fa-solid fa-check"></i> Approve</button>
                            <button class="btn btn-danger" onclick="adminApp.deleteDonation(${d.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `).join('');
            }

            // Render Cash pending
            if(cashPending.length === 0) {
                cashContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 0.5rem;"></i><p>No cash pending approvals.</p></div>';
            } else {
                cashContainer.innerHTML = cashPending.map(d => `
                    <div class="donor-card unpaid">
                        <div class="donor-card-header">
                            <div class="donor-info">
                                <h4>${d.name} <span style="font-size: 0.8rem; color: #718096;">(${d.surnameCategory}) - ₹ ${d.amount}</span></h4>
                                <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.2rem;">Event: ${d.eventName}</p>
                            </div>
                            <span class="status-badge" style="background: #dcfce7; color: #16a34a;">Cash</span>
                        </div>
                        <div style="margin-top: 1rem; border-top: 1px dashed #ccc; padding-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                            <select id="cash-mode-${d.id}" style="padding: 0.4rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.9rem;">
                                <option value="Cash" selected>Cash</option>
                                <option value="Online">Online</option>
                            </select>
                            <button class="btn btn-success" onclick="adminApp.markPaid(${d.id}, document.getElementById('cash-mode-${d.id}').value)"><i class="fa-solid fa-check"></i> Approve</button>
                            <button class="btn btn-danger" onclick="adminApp.deleteDonation(${d.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `).join('');
            }

            // Restore active tab
            this.switchPendingTab(this._pendingTab);
        } catch(err) {
            onlineContainer.innerHTML = '<p style="color: var(--danger-color);">Error loading records.</p>';
        }
    },

    async markPaid(id, mode) {
        if(!mode) mode = 'Cash';
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
                `<div class="surname-btn" style="cursor: pointer; position: relative; transition: all 0.2s; background: white;" onmouseover="this.style.background='#fffbee'" onmouseout="this.style.background='white'" onclick="adminApp.openSurnameDonations('${s.name.replace(/'/g, "\\'")}')">
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

    openSurnameDonations(surname) {
        // Switch view to Manage Donations
        this.showView('donations');
        
        // Update sidebar active state visually
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const navItem = document.querySelector(`.sidebar-nav li[data-view="donations"]`);
        if (navItem) navItem.classList.add('active');
        
        // Set the filter dropdown and load
        const filterDropdown = document.getElementById('filter-surname');
        if (filterDropdown) {
            filterDropdown.value = surname;
        }
        
        // Scroll to top to ensure visibility
        window.scrollTo(0, 0);
        
        // Load the filtered list
        this.filterDonations();
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
                <div class="special-donor-card ${d.isApproved ? '' : 'unpaid'}" style="${!d.isApproved ? 'border-left: 4px solid var(--danger-color);' : ''}">
                    <div class="special-donor-info">
                        <div class="special-donor-icon" style="${!d.isApproved ? 'background: var(--danger-color);' : ''}">
                            <i class="fa-solid fa-hand-holding-heart"></i>
                        </div>
                        <div class="special-donor-details">
                            <h4>${d.name} ${!d.isApproved ? '<span class="status-badge unpaid" style="font-size:0.7rem; margin-left:0.5rem;">Pending</span>' : ''}</h4>
                            ${d.amount > 0 ? `<span class="amount" style="color: var(--success-color); font-weight: 700;">₹ ${d.amount}</span>` : ''}
                            ${d.description ? `<p style="color: var(--text-light); margin-top: 0.3rem; font-size: 0.9rem;">${d.description}</p>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        ${!d.isApproved ? `<button class="btn btn-success" style="padding: 0.2rem 0.5rem;" onclick="adminApp.approveSpecialDonor(${d.id})"><i class="fa-solid fa-check"></i> Approve</button>` : ''}
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem; align-self: flex-end;" onclick="adminApp.deleteSpecialDonor(${d.id})">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
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

    async approveSpecialDonor(id) {
        if(!confirm('विशेष सहकार्य मंजूर (Approve) करायचे आहे का?')) return;
        try {
            await window.api.updateSpecialDonor(id, { isApproved: true });
            this.loadSpecialDonorsAdmin();
        } catch(err) {
            alert('Error approving: ' + err.message);
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

    // --- PREVIOUS DONATIONS ---
    async loadPreviousDonations() {
        const tbody = document.getElementById('admin-previous-table');
        if (!tbody) return;
        try {
            const data = await window.api.getPreviousDonations();
            tbody.innerHTML = data.map(d => `
                <tr>
                    <td>${d.description}</td>
                    <td>₹ ${d.amount}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-primary" style="padding: 0.2rem 0.5rem; margin-right: 0.5rem;" onclick="adminApp.editPreviousDonation(${d.id}, '${d.description}', ${d.amount})"><i class="fa-solid fa-edit"></i></button>
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deletePreviousDonation(${d.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch(err) {
            console.error(err);
        }
    },

    async addPreviousDonation() {
        const amount = document.getElementById('prev-amount').value;
        const description = document.getElementById('prev-desc').value;
        const isEditing = document.getElementById('prev-amount').dataset.editId;

        if(!amount) return alert('रक्कम भरणे आवश्यक आहे.');
        
        try {
            if (isEditing) {
                await window.api.updatePreviousDonation(isEditing, { amount, description });
                document.getElementById('prev-amount').removeAttribute('data-edit-id');
                document.querySelector('#view-previous .add-form .btn-success').innerHTML = '<i class="fa-solid fa-plus"></i> Add';
            } else {
                await window.api.addPreviousDonation({ amount, description });
            }
            document.getElementById('prev-amount').value = '';
            document.getElementById('prev-desc').value = 'मागील शिल्लक';
            this.loadPreviousDonations();
        } catch(err) {
            alert(err.message);
        }
    },

    editPreviousDonation(id, desc, amount) {
        document.getElementById('prev-desc').value = desc;
        document.getElementById('prev-amount').value = amount;
        document.getElementById('prev-amount').dataset.editId = id;
        document.querySelector('#view-previous .add-form .btn-success').innerHTML = '<i class="fa-solid fa-save"></i> Save';
    },

    async deletePreviousDonation(id) {
        if(!confirm('ही मागील शिल्लक डिलीट करायची आहे का?')) return;
        try {
            await window.api.deletePreviousDonation(id);
            this.loadPreviousDonations();
        } catch(err) {
            alert(err.message);
        }
    },

    // --- FEEDBACKS ---
    async loadFeedbacks() {
        const tbody = document.getElementById('admin-feedbacks-table');
        if (!tbody) return;
        try {
            const feedbacks = await window.api.getFeedbacks();
            tbody.innerHTML = feedbacks.map(f => `
                <tr>
                    <td>${new Date(f.created_at).toLocaleDateString()}</td>
                    <td>${f.name}</td>
                    <td>${f.mobile || '-'}</td>
                    <td>${f.message}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="adminApp.deleteFeedback(${f.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch(err) {
            console.error(err);
        }
    },

    async deleteFeedback(id) {
        if(!confirm('हा फीडबॅक डिलीट करायचा आहे का?')) return;
        try {
            await window.api.deleteFeedback(id);
            this.loadFeedbacks();
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

            // Load UPI ID
            const upiId = await window.api.getSetting('upiId');
            if(upiId && upiId.value) {
                const upiInput = document.getElementById('settings-upi-id');
                if (upiInput) upiInput.value = upiId.value;
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

    async updateUPI() {
        const value = document.getElementById('settings-upi-id').value;
        try {
            await window.api.updateSetting('upiId', value);
            alert('UPI ID updated successfully!');
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
    },

    // --- EXPORT: CSV DOWNLOAD ---
    _downloadCSV(filename, csvContent) {
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    async exportDonationsCSV() {
        try {
            const donations = await window.api.getDonations();
            const stats = await window.api.getStats();

            let csv = 'Sr No,Name,Surname,Amount (₹),Status,Payment Mode,Date,Event\n';
            donations.forEach((d, i) => {
                csv += `${i + 1},"${d.name}","${d.surnameCategory}",${d.amount},${d.isPaid ? 'Paid' : 'Pending'},"${d.paymentMode || (d.isPaid ? 'Cash' : 'N/A')}","${d.date ? new Date(d.date).toLocaleDateString() : '-'}","${d.eventName || ''}"\n`;
            });

            csv += `\n\nTotal Collected,₹ ${stats.totalCollected}\n`;
            csv += `Total Pending,₹ ${stats.totalPending}\n`;

            this._downloadCSV('Birdev_Donations_Report.csv', csv);
        } catch (err) {
            alert('Error exporting: ' + err.message);
        }
    },

    async exportExpensesCSV() {
        try {
            const expenses = await window.api.getExpenses();
            const stats = await window.api.getStats();

            let csv = 'Sr No,Date,Description,Amount (₹)\n';
            expenses.forEach((e, i) => {
                csv += `${i + 1},"${new Date(e.date).toLocaleDateString()}","${e.description}",${e.amount}\n`;
            });

            csv += `\n\nTotal Expenses,₹ ${stats.totalExpenses}\n`;

            this._downloadCSV('Birdev_Expenses_Report.csv', csv);
        } catch (err) {
            alert('Error exporting: ' + err.message);
        }
    },

    async printFullReport() {
        try {
            const stats = await window.api.getStats();
            const donations = await window.api.getDonations();
            const expenses = await window.api.getExpenses();

            let previousTotal = 0;
            try {
                const previous = await window.api.getPreviousDonations();
                previousTotal = previous.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            } catch(e) {}

            const paidDonations = donations.filter(d => d.isPaid);
            const pendingDonations = donations.filter(d => !d.isPaid);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>बिरदेव जयंती - Financial Report</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; color: #2d3748; font-size: 13px; }
                        h1 { text-align: center; color: #d69e2e; margin-bottom: 0.3rem; font-size: 1.4rem; }
                        .subtitle { text-align: center; color: #718096; margin-bottom: 1.5rem; font-size: 0.85rem; }
                        .summary-grid { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
                        .summary-card { flex: 1; min-width: 120px; text-align: center; padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 8px; }
                        .summary-card h3 { font-size: 0.75rem; color: #718096; margin-bottom: 0.3rem; }
                        .summary-card h2 { font-size: 1.2rem; }
                        .green { color: #38a169; }
                        .red { color: #e53e3e; }
                        .gold { color: #d69e2e; }
                        .purple { color: #6b46c1; }
                        h2.section { margin: 1.5rem 0 0.5rem; border-bottom: 2px solid #f6e05e; padding-bottom: 0.3rem; font-size: 1rem; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8rem; }
                        th, td { padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; text-align: left; }
                        th { background: #fefcbf; font-weight: 600; }
                        .paid { color: #38a169; font-weight: 600; }
                        .pending { color: #e53e3e; font-weight: 600; }
                        .footer { margin-top: 2rem; text-align: center; color: #a0aec0; font-size: 0.75rem; border-top: 1px solid #e2e8f0; padding-top: 0.8rem; }
                        @media print { body { padding: 1rem; } }
                    </style>
                </head>
                <body>
                    <h1>🏛️ बिरदेव जयंती उत्सव समिती</h1>
                    <p class="subtitle">Financial Report — Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>

                    <div class="summary-grid">
                        <div class="summary-card"><h3>Total Collected</h3><h2 class="gold">₹ ${stats.totalCollected}</h2></div>
                        <div class="summary-card"><h3>Total Expenses</h3><h2 class="red">₹ ${stats.totalExpenses}</h2></div>
                        <div class="summary-card"><h3>Remaining Balance</h3><h2 class="green">₹ ${stats.remainingBalance}</h2></div>
                        <div class="summary-card"><h3>Previous Balance</h3><h2 class="purple">₹ ${previousTotal}</h2></div>
                    </div>

                    <h2 class="section">✅ Paid Donations (${paidDonations.length})</h2>
                    <table>
                        <tr><th>Sr</th><th>Name</th><th>Surname</th><th>Amount</th><th>Mode</th><th>Date</th></tr>
                        ${paidDonations.map((d, i) => `<tr><td>${i + 1}</td><td>${d.name}</td><td>${d.surnameCategory}</td><td>₹ ${d.amount}</td><td>${d.paymentMode || 'Cash'}</td><td>${d.date ? new Date(d.date).toLocaleDateString() : '-'}</td></tr>`).join('')}
                    </table>

                    <h2 class="section">⏳ Pending Donations (${pendingDonations.length})</h2>
                    <table>
                        <tr><th>Sr</th><th>Name</th><th>Surname</th><th>Amount</th></tr>
                        ${pendingDonations.map((d, i) => `<tr><td>${i + 1}</td><td>${d.name}</td><td>${d.surnameCategory}</td><td>₹ ${d.amount}</td></tr>`).join('')}
                    </table>

                    <h2 class="section">💸 Expenses (${expenses.length})</h2>
                    <table>
                        <tr><th>Sr</th><th>Date</th><th>Description</th><th>Amount</th></tr>
                        ${expenses.map((e, i) => `<tr><td>${i + 1}</td><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.description}</td><td>₹ ${e.amount}</td></tr>`).join('')}
                    </table>

                    <div class="footer">
                        <p>This is an auto-generated report by बिरदेव जयंती उत्सव समिती Financial System.</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (err) {
            alert('Error generating report: ' + err.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
