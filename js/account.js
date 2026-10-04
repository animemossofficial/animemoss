document.addEventListener("DOMContentLoaded", async () => {
    const user = await AnimeMossAuth.getCurrentUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    renderAccount(user);
    setupDisplayNameEditor(user);
    setupChangePassword();
    setupLogoutAll();
    setupLogout();
});

function renderAccount(user) {
    const displayName = user.displayName || "User";
    const username = user.username || "—";

    document.querySelector("#account-name").textContent =
        displayName;

    document.querySelector("#account-username").textContent =
        username;

    document.querySelector("#account-display-name").textContent =
        displayName;

    document.querySelector("#account-email").textContent =
        user.email;

    document.querySelector("#account-email-status").textContent =
        user.emailVerified ? "Verified" : "Not verified";

    document.querySelector("#account-created").textContent =
        formatDate(user.createdAt);

    document.querySelector("#account-avatar").textContent =
        displayName.trim().charAt(0).toUpperCase();
}

async function setupDisplayNameEditor(user) {
    const editButton = document.querySelector(
        "#edit-display-name-btn"
    );

    const editor = document.querySelector(
        "#display-name-editor"
    );

    const input = document.querySelector(
        "#display-name-input"
    );

    const saveButton = document.querySelector(
        "#save-display-name-btn"
    );

    const cancelButton = document.querySelector(
        "#cancel-display-name-btn"
    );

    if (
        !editButton ||
        !editor ||
        !input ||
        !saveButton ||
        !cancelButton
    ) {
        return;
    }

    editButton.addEventListener("click", () => {
        input.value = user.displayName || "";
        editor.hidden = false;
        editButton.hidden = true;
        input.focus();
        input.select();
    });

    cancelButton.addEventListener("click", () => {
        input.value = user.displayName || "";
        editor.hidden = true;
        editButton.hidden = false;
    });

    saveButton.addEventListener("click", async () => {
        const displayName = input.value.trim();

        if (displayName.length < 2 || displayName.length > 32) {
            showMessage(
                "Display name must be between 2 and 32 characters.",
                "error"
            );
            input.focus();
            return;
        }

        if (displayName === (user.displayName || "")) {
            editor.hidden = true;
            editButton.hidden = false;
            return;
        }

        saveButton.disabled = true;
        cancelButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const response = await fetch(
                "https://animemoss-api-production.up.railway.app/auth/profile",
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        displayName
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to update your display name."
                );
            }

            if (data.user) {
                Object.assign(user, data.user);
            }

            renderAccount(user);

            editor.hidden = true;
            editButton.hidden = false;

            showMessage(
                "Display name updated successfully.",
                "success"
            );
        } catch (error) {
            console.error(
                "Display name update failed:",
                error
            );

            showMessage(
                error.message ||
                "Unable to update your display name.",
                "error"
            );
        } finally {
            saveButton.disabled = false;
            cancelButton.disabled = false;
            saveButton.textContent = "Save";
        }
    });
}

function setupChangePassword() {
    const button = document.querySelector("#change-password-btn");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        window.location.href = "change-password.html";
    });
}

function setupLogoutAll() {
    const button = document.querySelector("#logout-all-btn");

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {
        const confirmed = window.confirm(
            "Log out from all AnimeMOSS devices?"
        );

        if (!confirmed) {
            return;
        }

        button.disabled = true;
        button.textContent = "Logging out...";

        try {
            await AnimeMossAuth.logoutAll();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout-all failed:", error);

            button.disabled = false;
            button.textContent = "Logout All Devices";

            showMessage(
                "Unable to log out from all devices.",
                "error"
            );
        }
    });
}

function setupLogout() {
    const button = document.querySelector("#logout-btn");

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Logging out...";

        try {
            await AnimeMossAuth.logout();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout failed:", error);

            button.disabled = false;
            button.textContent = "Logout";

            showMessage(
                "Unable to sign out right now.",
                "error"
            );
        }
    });
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "Unknown";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function showMessage(message, type) {
    const element = document.querySelector("#account-message");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className =
        `account-message visible ${type}`;
}
