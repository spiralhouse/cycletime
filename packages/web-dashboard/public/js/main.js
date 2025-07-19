// CycleTime Dashboard - Main JavaScript

// Global CycleTime object
window.CycleTime = window.CycleTime || {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    CycleTime.init();
});

// Main application initialization
CycleTime.init = function() {
    console.log('CycleTime Dashboard initialized');
    
    // Initialize components
    CycleTime.auth.init();
    CycleTime.websocket.init();
    CycleTime.notifications.init();
    CycleTime.theme.init();
    
    // Initialize page-specific functionality
    const path = window.location.pathname;
    switch(path) {
        case '/':
            CycleTime.pages.home.init();
            break;
        case '/dashboard':
            CycleTime.pages.dashboard.init();
            break;
        case '/projects':
            CycleTime.pages.projects.init();
            break;
        case '/tasks':
            CycleTime.pages.tasks.init();
            break;
        case '/analytics':
            CycleTime.pages.analytics.init();
            break;
        case '/settings':
            CycleTime.pages.settings.init();
            break;
    }
};

// Authentication module
CycleTime.auth = {
    init: function() {
        this.checkAuth();
    },
    
    checkAuth: function() {
        const token = localStorage.getItem('authToken');
        const publicPaths = ['/', '/login', '/register', '/forgot-password'];
        
        if (!token && !publicPaths.includes(window.location.pathname)) {
            // Redirect to login if not authenticated
            window.location.href = '/login';
        }
    },
    
    login: function(email, password) {
        return fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('authToken', data.data.tokens.accessToken);
                localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                return data;
            } else {
                throw new Error(data.message || 'Login failed');
            }
        });
    },
    
    logout: function() {
        const token = localStorage.getItem('authToken');
        
        if (token) {
            fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    },
    
    getToken: function() {
        return localStorage.getItem('authToken');
    },
    
    getUser: function() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    isAuthenticated: function() {
        return !!localStorage.getItem('authToken');
    }
};

// WebSocket module
CycleTime.websocket = {
    socket: null,
    
    init: function() {
        if (typeof io !== 'undefined' && CycleTime.auth.isAuthenticated()) {
            this.connect();
        }
    },
    
    connect: function() {
        this.socket = io({
            auth: {
                token: CycleTime.auth.getToken()
            }
        });
        
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            CycleTime.notifications.show('Connected to real-time updates', 'success');
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            CycleTime.notifications.show('Disconnected from real-time updates', 'warning');
        });
        
        this.socket.on('notification', (data) => {
            CycleTime.notifications.show(data.message, data.type || 'info');
        });
        
        this.socket.on('dashboard.data.updated', (data) => {
            // Refresh dashboard data
            if (window.location.pathname === '/dashboard') {
                CycleTime.pages.dashboard.refreshData();
            }
        });
        
        this.socket.on('user.connected', (data) => {
            console.log('User connected:', data.username);
        });
        
        this.socket.on('user.disconnected', (data) => {
            console.log('User disconnected:', data.username);
        });
    },
    
    disconnect: function() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    },
    
    emit: function(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
};

// Notifications module
CycleTime.notifications = {
    init: function() {
        // Request notification permissions
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },
    
    show: function(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
        
        // Also show browser notification for important messages
        if (type === 'error' || type === 'warning') {
            this.showBrowserNotification(message, type);
        }
    },
    
    showBrowserNotification: function(message, type) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('CycleTime Dashboard', {
                body: message,
                icon: '/public/favicon.ico',
                tag: type,
            });
        }
    }
};

// Theme module
CycleTime.theme = {
    init: function() {
        this.applyTheme();
        this.watchSystemTheme();
    },
    
    applyTheme: function() {
        const theme = this.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    },
    
    getTheme: function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && savedTheme !== 'auto') {
            return savedTheme;
        }
        
        // Use system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    
    setTheme: function(theme) {
        localStorage.setItem('theme', theme);
        this.applyTheme();
    },
    
    watchSystemTheme: function() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (localStorage.getItem('theme') === 'auto') {
                this.applyTheme();
            }
        });
    }
};

// API utility module
CycleTime.api = {
    request: function(url, options = {}) {
        const token = CycleTime.auth.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };
        
        return fetch(url, mergedOptions)
            .then(response => {
                if (response.status === 401) {
                    // Token expired, redirect to login
                    CycleTime.auth.logout();
                    throw new Error('Authentication required');
                }
                return response.json();
            })
            .catch(error => {
                console.error('API request failed:', error);
                throw error;
            });
    },
    
    get: function(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    },
    
    post: function(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    put: function(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    delete: function(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }
};

// Page-specific modules
CycleTime.pages = {
    home: {
        init: function() {
            console.log('Home page initialized');
        }
    },
    
    dashboard: {
        init: function() {
            console.log('Dashboard page initialized');
            this.loadData();
        },
        
        loadData: function() {
            return CycleTime.api.get('/api/v1/dashboard/overview')
                .then(data => {
                    if (data.success) {
                        this.updateUI(data.data);
                    }
                })
                .catch(error => {
                    CycleTime.notifications.show('Failed to load dashboard data', 'error');
                });
        },
        
        refreshData: function() {
            this.loadData();
        },
        
        updateUI: function(data) {
            // Update dashboard UI with new data
            console.log('Dashboard data updated:', data);
        }
    },
    
    projects: {
        init: function() {
            console.log('Projects page initialized');
        }
    },
    
    tasks: {
        init: function() {
            console.log('Tasks page initialized');
        }
    },
    
    analytics: {
        init: function() {
            console.log('Analytics page initialized');
        }
    },
    
    settings: {
        init: function() {
            console.log('Settings page initialized');
        }
    }
};

// Utility functions
CycleTime.utils = {
    formatDate: function(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },
    
    formatNumber: function(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Event listeners for common actions
document.addEventListener('click', function(e) {
    // Handle logout clicks
    if (e.target.matches('[data-action="logout"]')) {
        e.preventDefault();
        CycleTime.auth.logout();
    }
    
    // Handle theme toggle
    if (e.target.matches('[data-action="toggle-theme"]')) {
        const currentTheme = CycleTime.theme.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        CycleTime.theme.setTheme(newTheme);
    }
});

// Handle online/offline status
window.addEventListener('online', function() {
    CycleTime.notifications.show('Connection restored', 'success');
    if (CycleTime.auth.isAuthenticated()) {
        CycleTime.websocket.connect();
    }
});

window.addEventListener('offline', function() {
    CycleTime.notifications.show('Connection lost', 'warning');
    CycleTime.websocket.disconnect();
});

// Handle visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden
        console.log('Page hidden');
    } else {
        // Page is visible
        console.log('Page visible');
        // Refresh data if needed
        if (CycleTime.auth.isAuthenticated()) {
            const path = window.location.pathname;
            if (path === '/dashboard' && typeof CycleTime.pages.dashboard.refreshData === 'function') {
                CycleTime.pages.dashboard.refreshData();
            }
        }
    }
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    CycleTime.notifications.show('An error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    CycleTime.notifications.show('An error occurred. Please try again.', 'error');
});

// Export CycleTime to global scope
window.CycleTime = CycleTime;