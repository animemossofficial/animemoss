document.addEventListener("DOMContentLoaded", async () => {
    const user = await AnimeMossAuth.getCurrentUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    setupChangePasswordForm();
});

function setupChangePasswordForm() {
    const form = document.querySelector("#change-password-form");
    const button = document.querySelector("#change-password-submit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmNewPassword = form.confirmNewPassword.value;

        if (currentPassword.length < 8) {
            showError("Please enter your current password.");
            form.currentPassword.focus();
            return;
        }

        if (newPassword.length < 8) {
            showError("New password must be at least 8 characters.");
            form.newPassword.focus();
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showError("New passwords do not match.");
            form.confirmNewPassword.focus();
            return;
        }

        button.disabled = true;
        button.textContent = "Changing Password...";

        try {
            await AnimeMossAuth.changePassword({
                currentPassword,
                newPassword
            });

            form.reset();

            showSuccess(
                "Password changed successfully."
            );

        } catch (error) {
            if (error.status === 401) {
                showError(
                    error.message ||
                    "Current password is incorrect."
                );
            } else if (error.status === 429) {
                showError(
                    "Too many attempts. Please try again later."
                );
            } else {
                showError(
                    error.message ||
                    "Unable to change your password."
                );
            }
        } finally {
            button.disabled = false;
            button.textContent = "Change Password";
        }
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
