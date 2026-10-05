const AUTH_API_BASE = "https://animemoss-api-production.up.railway.app";

const AnimeMossAuth = (() => {
    let currentUser = null;

    async function request(path, options = {}) {
        const response = await fetch(`${AUTH_API_BASE}${path}`, {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const error = new Error(data?.error || "Something went wrong. Please try again.");
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    async function getCurrentUser() {
        try {
            const data = await request("/auth/me");
            currentUser = data?.authenticated ? data.user : null;
            return currentUser;
        } catch (error) {
            console.error("AnimeMOSS auth check failed:", error);
            currentUser = null;
            return null;
        }
    }

    async function signup(payload) {
        const data = await request("/auth/signup", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        currentUser = data.user || null;
        return currentUser;
    }

    async function login(payload) {
        const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        currentUser = data.user || null;
        return currentUser;
    }

    async function logout() {
        await request("/auth/logout", { method: "POST" });
        currentUser = null;
    }

    async function logoutAll() {
        await request("/auth/logout-all", { method: "POST" });
        currentUser = null;
    }

    async function changePassword(payload) {
        return request("/auth/change-password", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    function getUser() { return currentUser; }
    function isLoggedIn() { return Boolean(currentUser); }

    return {
        getCurrentUser,
        signup,
        login,
        logout,
        logoutAll,
        changePassword,
        getUser,
        isLoggedIn
    };
})();

window.AnimeMossAuth = AnimeMossAuth;
