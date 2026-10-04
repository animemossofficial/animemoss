const form = document.getElementById("google-signup-form");
const usernameInput = document.getElementById("google-signup-username");
const nameInput = document.getElementById("google-signup-name");
const passwordInput = document.getElementById("google-signup-password");
const confirmPasswordInput = document.getElementById("google-signup-confirm-password");
const submitButton = document.getElementById("google-signup-submit");
const message = document.getElementById("auth-message");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `auth-message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const displayName = nameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
        showMessage(
            "Username must be 3–20 characters and can only contain letters, numbers, and underscores."
        );
        usernameInput.focus();
        return;
    }

    if (displayName.length < 2 || displayName.length > 32) {
        showMessage("Display name must be between 2 and 32 characters.");
        nameInput.focus();
        return;
    }

    if (password.length < 8) {
        showMessage("Password must be at least 8 characters.");
        passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.");
        confirmPasswordInput.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating Account...";
    message.textContent = "";
    message.className = "auth-message";

    try {
        const response = await fetch(
            "https://animemoss-api-production.up.railway.app/auth/google/complete-signup",
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    displayName,
                    password
                })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to create your AnimeMOSS account."
            );
        }

        window.location.href = "index.html?google=success";
    } catch (error) {
        showMessage(
            error.message ||
            "Something went wrong. Please try Google Sign-In again."
        );

        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
    }
});
