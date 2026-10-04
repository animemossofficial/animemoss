document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.querySelector("#login-form");
    const signupForm = document.querySelector("#signup-form");

    setupPasswordToggles();

    const existingUser = await AnimeMossAuth.getCurrentUser();

    if (existingUser) {
        window.location.href = "index.html";
        return;
    }

    if (loginForm) {
        setupLoginForm(loginForm);
    }

    if (signupForm) {
        setupSignupForm(signupForm);
    }
});

function setupPasswordToggles() {
    const buttons = document.querySelectorAll("[data-password-toggle]");

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const selector = button.dataset.passwordToggle;
            const input = document.querySelector(selector);

            if (!input) {
                return;
            }

            const isPassword = input.type === "password";

            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Hide" : "Show";
        });
    });
}

function setupLoginForm(form) {
    const submitButton = form.querySelector("#login-submit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value;

        if (!email) {
            showError("Please enter your email address.");
            form.email.focus();
            return;
        }

        if (!password) {
            showError("Please enter your password.");
            form.password.focus();
            return;
        }

        setLoading(submitButton, true, "Signing In...");

        try {
            await AnimeMossAuth.login({
                email,
                password
            });

            showSuccess("Login successful. Redirecting...");

            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 350);

        } catch (error) {
            if (error.status === 401) {
                showError("Invalid email or password.");
            } else {
                showError(
                    error.message ||
                    "Unable to sign in right now. Please try again."
                );
            }

            setLoading(submitButton, false, "Sign In");
        }
    });
}

function setupSignupForm(form) {
    const submitButton = form.querySelector("#signup-submit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const username = form.username.value.trim();
        const displayName = form.displayName.value.trim();
        const email = form.email.value.trim().toLowerCase();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            showError(
                "Username must be 3–20 characters and can only contain letters, numbers, and underscores."
            );
            form.username.focus();
            return;
        }

        if (displayName.length < 2) {
            showError("Display name must be at least 2 characters.");
            form.displayName.focus();
            return;
        }

        if (displayName.length > 32) {
            showError("Display name must be 32 characters or less.");
            form.displayName.focus();
            return;
        }

        if (!email) {
            showError("Please enter your email address.");
            form.email.focus();
            return;
        }

        if (password.length < 8) {
            showError("Password must be at least 8 characters.");
            form.password.focus();
            return;
        }

        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            form.confirmPassword.focus();
            return;
        }

        setLoading(submitButton, true, "Creating Account...");

        try {
            await AnimeMossAuth.signup({
                username,
                displayName,
                email,
                password
            });

            showSuccess("Account created. Redirecting...");

            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 350);

        } catch (error) {
            if (error.status === 409) {
                showError(
                    "An account with this email already exists."
                );
            } else {
                showError(
                    error.message ||
                    "Unable to create your account right now."
                );
            }

            setLoading(submitButton, false, "Create Account");
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

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `auth-message is-visible is-${type}`;
}

function clearMessage() {
    const element = document.querySelector("#auth-message");

    if (!element) {
        return;
    }

    element.textContent = "";
    element.className = "auth-message";
}

function setLoading(button, loading, text) {
    if (!button) {
        return;
    }

    button.disabled = loading;
    button.textContent = text;
}
