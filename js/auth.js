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

        let data = null;

        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const error = new Error(
                data?.error || "Something went wrong. Please try again."
            );

            error.status = response.status;
            error.data = data;

            throw error;
        }

        return data;
    }

    async function getCurrentUser() {
        try {
            const data = await request("/auth/me");

            currentUser = data.authenticated
                ? data.user
                : null;

            return currentUser;
        } catch (error) {
            if (error.status === 401) {
                currentUser = null;
                return null;
            }

            console.error("AnimeMoss auth check failed:", error);
            currentUser = null;
            return null;
        }
    }

    async function signup({ username, displayName, email, password }) {
        const data = await request("/auth/signup", {
            method: "POST",
            body: JSON.stringify({
                username,
                displayName,
                email,
                password
            })
        });

        currentUser = data.user || null;

        return currentUser;
    }

    async function login({ email, password }) {
        const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        });

        currentUser = data.user || null;

        return currentUser;
    }

    async function logout() {
        await request("/auth/logout", {
            method: "POST"
        });

        currentUser = null;
    }

    async function changePassword({ currentPassword, newPassword }) {
        const data = await request("/auth/change-password", {
            method: "POST",
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        return data;
    }

    async function logoutAll() {
        await request("/auth/logout-all", {
            method: "POST"
        });

        currentUser = null;
    }

    function getUser() {
        return currentUser;
    }

    function isLoggedIn() {
        return currentUser !== null;
    }

    return {
        getCurrentUser,
        signup,
        login,
        logout,
        changePassword,
        logoutAll,
        getUser,
        isLoggedIn
    };
})();

window.AnimeMossAuth = AnimeMossAuth;
