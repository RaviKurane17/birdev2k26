const API_URL = '/api';

const api = {
    // Helper to get auth headers
    getHeaders() {
        const token = localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    // Handle generic response
    async handleResponse(res) {
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'API Error');
        }
        return res.json();
    },

    // Login
    async login(username, password) {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await this.handleResponse(res);
        localStorage.setItem('adminToken', data.token);
        return data;
    },

    // Get all stats
    async getStats() {
        const res = await fetch(`${API_URL}/stats`);
        return this.handleResponse(res);
    },

    // Get all donations
    async getDonations() {
        const res = await fetch(`${API_URL}/donations`);
        return this.handleResponse(res);
    },

    // Add donation (Admin)
    async addDonation(data) {
        const res = await fetch(`${API_URL}/donations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },

    // Update donation status (Admin)
    async updateDonation(id, data) {
        const res = await fetch(`${API_URL}/donations/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },

    // Delete donation (Admin)
    async deleteDonation(id) {
        const res = await fetch(`${API_URL}/donations/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    // Get expenses
    async getExpenses() {
        const res = await fetch(`${API_URL}/expenses`);
        return this.handleResponse(res);
    },

    // Add expense (Admin)
    async addExpense(data) {
        const res = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },

    // Delete expense (Admin)
    async deleteExpense(id) {
        const res = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    // --- Surnames ---
    async getSurnames() {
        const res = await fetch(`${API_URL}/surnames`);
        return this.handleResponse(res);
    },
    async addSurname(name) {
        const res = await fetch(`${API_URL}/surnames`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ name })
        });
        return this.handleResponse(res);
    },
    async deleteSurname(id) {
        const res = await fetch(`${API_URL}/surnames/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    // --- Committee ---
    async getCommittee() {
        const res = await fetch(`${API_URL}/committee`);
        return this.handleResponse(res);
    },
    async addCommitteeMember(data) {
        const res = await fetch(`${API_URL}/committee`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },
    async deleteCommitteeMember(id) {
        const res = await fetch(`${API_URL}/committee/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    // --- Settings ---
    async getSetting(key) {
        const res = await fetch(`${API_URL}/settings/${key}`);
        return this.handleResponse(res);
    },
    async updateSetting(key, value) {
        const res = await fetch(`${API_URL}/settings/${key}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ value })
        });
        return this.handleResponse(res);
    },

    // --- Upload ---
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: headers, // Do NOT set Content-Type, fetch will set it automatically with boundary
            body: formData
        });
        return this.handleResponse(res);
    },

    // --- Special Donors (विशेष सहकार्य) ---
    async getSpecialDonors() {
        const res = await fetch(`${API_URL}/special-donors`);
        return this.handleResponse(res);
    },
    async addSpecialDonor(data) {
        const res = await fetch(`${API_URL}/special-donors`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },
    async deleteSpecialDonor(id) {
        const res = await fetch(`${API_URL}/special-donors/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },
    async updateSpecialDonor(id, data) {
        const res = await fetch(`${API_URL}/special-donors/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },

    // --- Previous Donations ---
    async getPreviousDonations() {
        const res = await fetch(`${API_URL}/previous-donations`);
        return this.handleResponse(res);
    },
    async addPreviousDonation(data) {
        const res = await fetch(`${API_URL}/previous-donations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },
    async updatePreviousDonation(id, data) {
        const res = await fetch(`${API_URL}/previous-donations/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },
    async deletePreviousDonation(id) {
        const res = await fetch(`${API_URL}/previous-donations/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    // --- Feedbacks ---
    async getFeedbacks() {
        const res = await fetch(`${API_URL}/feedbacks`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },
    async addFeedback(data) {
        const res = await fetch(`${API_URL}/feedbacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return this.handleResponse(res);
    },
    async deleteFeedback(id) {
        const res = await fetch(`${API_URL}/feedbacks/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    }
};

window.api = api;
