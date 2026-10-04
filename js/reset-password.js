document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggles();

    const form = document.querySelector("#reset-password-form");
    const button = document.querySelector("#reset-submit");

    const token = sessionStorage.getItem(
        "animemoss_password_reset_token"
    );

    if (!token) {
        showError(
            "This password reset session is missing or expired."
        );

        button.disabled = true;
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (newPassword.length < 8) {
            showError(
                "New password must be at least 8 characters."
            );
            form.newPassword.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showError(
                "Passwords do not match."
            );
            form.confirmPassword.focus();
            return;
        }

        button.disabled = true;
        button.textContent = "Resetting...";

        try {
            const response = await fetch(
                "https://animemoss-api-production.up.railway.app/auth/reset-password",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token,
                        newPassword
                    })
                }
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "Unable to reset your password."
                );
            }

            sessionStorage.removeItem(
                "animemoss_password_reset_token"
            );

            showSuccess(
                "Password reset successfully. Redirecting to login..."
            );

            form.reset();

            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            if (error.status === 429) {
                showError(
                    "Too many attempts. Please try again later."
                );
            } else {
                showError(
                    error.message ||
                    "Unable to reset your password."
                );
            }

            button.disabled = false;
            button.textContent = "Reset Password";
        }
    });
});

function setupPasswordToggles() {
    const buttons = document.querySelectorAll(
        "[data-password-toggle]"
    );

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.querySelector(
                button.dataset.passwordToggle
            );

            if (!input) {
                return;
            }

            const showing = input.type === "text";

            input.type = showing
                ? "password"
                : "text";

            button.textContent = showing
                ? "Show"
                : "Hide";
        });
    });
}

function showError(message) {
    showMessage(message, "error");
}

function showSuccess(message) {
    showMessage(message, "success");
}

function showMessage(message, type) {
    const element = document.querySelector("#auth-message");

    element.textContent = message;
    element.className =
        `auth-message is-visible is-${type}`;
}

function clearMessage() {
    const element = document.querySelector("#auth-message");

    element.textContent = "";
    element.className = "auth-message";
}
